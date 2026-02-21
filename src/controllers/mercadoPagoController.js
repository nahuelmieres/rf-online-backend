const crypto = require('crypto');
const Pago = require('../models/Pago');
const Subscription = require('../models/Subscription');
const Usuario = require('../models/Usuario');
const { crearPreferencia } = require('../services/mercadoPagoServices');

// Genero link de pago - ACTUALIZADO para soportar suscripciones
const generarLinkPagoMP = async (req, res) => {
  try {
    const { monto, plan, tipo = 'compra_unica' } = req.body;

    // Validar monto
    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'Monto inválido' });
    }

    // Si es una suscripción, validar plan
    if (tipo === 'suscripcion') {
      if (!plan || !['basico', 'personalizado'].includes(plan)) {
        return res.status(400).json({ mensaje: 'Plan inválido para suscripción' });
      }

      // Verificar suscripción existente
      const Subscription = require('../models/Subscription');
      const suscripcionExistente = await Subscription.findOne({
        usuario: req.usuario.id,
        estado: { $in: ['active', 'waiting_payment'] }
      });

      if (suscripcionExistente) {
        return res.status(400).json({
          mensaje: 'Ya tenés una suscripción activa o en proceso',
          code: 'SUBSCRIPTION_ALREADY_EXISTS'
        });
      }
    }

    const preferencia = await crearPreferencia(req.usuario, monto, { plan, tipo });

    if (!preferencia || !preferencia.init_point) {
      return res.status(400).json({ mensaje: 'No se pudo generar el link de pago' });
    }

    // Guardar pago
    await Pago.create({
      usuario: req.usuario.id,
      externalId: preferencia.id,
      estado: 'pendiente',
      monto,
      moneda: 'UYU',
      metodo: 'mercadopago',
      tipo
    });

    // Si es suscripción, crear registro pendiente
    if (tipo === 'suscripcion') {
      const Subscription = require('../models/Subscription');
      const precioUSD = plan === 'basico' ? 31.99 : 99.99;
      const currentDate = new Date();
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await Subscription.create({
        usuario: req.usuario.id,
        estado: 'waiting_payment',
        plan,
        provider: 'mercadopago',
        providerSubscriptionId: preferencia.id,
        precio: precioUSD,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextMonth
      });
    }

    res.status(200).json({
      init_point: preferencia.init_point,
      sandbox_init_point: preferencia.sandbox_init_point
    });
  } catch (error) {
    console.error('Error al generar preferencia MP:', error);
    res.status(500).json({
      mensaje: 'Error al generar link de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Proceso notificaciones de webhook - ACTUALIZADO
const recibirNotificacionMP = async (req, res) => {
  try {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-signature'];
      const payload = JSON.stringify(req.body);
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (signature !== `sha256=${generatedSignature}`) {
        console.error('Firma inválida');
        return res.status(401).send('Firma inválida');
      }
    }

    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });
    const pagoMP = await response.json();

    const preferenceId = pagoMP.additional_info?.preference_id;
    if (!preferenceId) {
      console.error('No se encontró preference_id');
      return res.status(400).send('Referencia inválida');
    }

    const estadoMap = {
      'approved': 'aprobado',
      'pending': 'pendiente',
      'rejected': 'rechazado',
      'cancelled': 'cancelado',
      'refunded': 'reembolsado'
    };
    const estado = estadoMap[pagoMP.status] || pagoMP.status;

    // Actualizar pago
    const pago = await Pago.findOneAndUpdate(
      { externalId: preferenceId },
      {
        estado: estado,
        paymentId: pagoMP.id
      },
      { new: true }
    );

    if (!pago) {
      console.warn('Pago no encontrado con preferenceId:', preferenceId);
      return res.sendStatus(404);
    }

    // Si es aprobado, activar suscripción o usuario
    if (estado === 'aprobado') {
      if (pago.tipo === 'suscripcion') {
        // Activar suscripción
        await Subscription.findOneAndUpdate(
          { providerSubscriptionId: preferenceId },
          { estado: 'active' }
        );

        // Actualizar referencia en usuario
        const subscription = await Subscription.findOne({ providerSubscriptionId: preferenceId });
        await Usuario.findByIdAndUpdate(pago.usuario, { subscription: subscription._id });

        console.log('Suscripción activada:', pago.usuario);
      } else {
        // Pago único - activar usuario temporalmente
        await Usuario.findByIdAndUpdate(pago.usuario, { estadoPago: true });
        console.log('Usuario activado:', pago.usuario);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook MP:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  generarLinkPagoMP,
  recibirNotificacionMP
};
const crypto = require('crypto');
const Pago = require('../models/Pago');
const Usuario = require('../models/Usuario');
const { crearPreferencia } = require('../services/mercadoPagoServices');

// Genero link de pago
const generarLinkPagoMP = async (req, res) => {
  try {
    const { monto } = req.body;

    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'Monto inválido' });
    }

    const preferencia = await crearPreferencia(req.usuario, monto);
    if (!preferencia || !preferencia.init_point) {
      return res.status(400).json({ mensaje: 'No se pudo generar el link de pago' });
    }

    // Guardo el pago con preferenceId
    await Pago.create({
      usuario: req.usuario.id,
      preferenceId: preferencia.id,
      estado: 'pendiente',
      monto,
      moneda: 'UYU',
      metodo: 'mercadopago'
    });

    res.status(200).json({ init_point: preferencia.init_point });
  } catch (error) {
    console.error('Error al generar preferencia MP:', error);
    res.status(500).json({ mensaje: 'Error al generar link de pago' });
  }
};

// Proceso notificaciones de webhook
const recibirNotificacionMP = async (req, res) => {
  try {
    // Valido firma del webhook
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

    // Obtengo detalles del pago desde MP
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      }
    });
    const pagoMP = await response.json();

    // Extraigo preferenceId
    const preferenceId = pagoMP.additional_info?.preference_id;
    if (!preferenceId) {
      console.error('No se encontró preference_id');
      return res.status(400).send('Referencia inválida');
    }

    // Defino estados posibles
    const estadoMap = {
      'approved': 'aprobado',
      'pending': 'pendiente',
      'rejected': 'rechazado',
      'cancelled': 'cancelado',
      'refunded': 'reembolsado'
    };
    const estado = estadoMap[pagoMP.status] || pagoMP.status;

    // Actualizo pago en base de datos
    const pago = await Pago.findOneAndUpdate(
      { preferenceId: preferenceId },
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

    // Activo usuario si el pago está aprobado
    if (estado === 'aprobado') {
      await Usuario.findByIdAndUpdate(pago.usuario, { estadoPago: true });
      console.log('Usuario activado:', pago.usuario);
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
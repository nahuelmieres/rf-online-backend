const express = require('express');
const router = express.Router();
const {verificarToken, verificarSuscripcionActiva} = require('../middlewares/authMiddleware');
const { generarLinkPagoMP, recibirNotificacionMP } = require('../controllers/mercadoPagoController');
const { 
  crearSuscripcionBasico,
  crearSuscripcionPersonalizado,
  webhookPaypal 
} = require('../controllers/payPalController');
const Usuario = require('../models/Usuario');

// MercadoPago (mantener para futura implementación)
router.post('/mercadopago/preferencia', verificarToken, generarLinkPagoMP);
router.post('/mercadopago/webhook', recibirNotificacionMP);

// PayPal - Nuevos endpoints para suscripciones
router.post('/paypal/suscripcion/basico', verificarToken, crearSuscripcionBasico);
router.post('/paypal/suscripcion/personalizado', verificarToken, crearSuscripcionPersonalizado);
router.post('/paypal/webhook', webhookPaypal);

// ACTUALIZADO: Endpoint para verificar estado de suscripción usando el virtual
router.get('/suscripcion/estado', verificarToken, async (req, res) => {
  try {
    const { id: usuarioId, rol } = req.usuario;

    // Buscar usuario y popular subscription
    const usuario = await Usuario.findById(usuarioId)
      .populate('subscription')
      .lean({ virtuals: true }); // Importante: incluir virtuals

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // El virtual estadoPago ya hace toda la lógica
    const hasActiveSubscription = usuario.estadoPago;

    // Detalles adicionales si tiene suscripción
    if (usuario.subscription && typeof usuario.subscription === 'object') {
      return res.json({ 
        hasActiveSubscription,
        plan: usuario.subscription.plan,
        currentPeriodEnd: usuario.subscription.currentPeriodEnd,
        provider: usuario.subscription.provider,
        estado: usuario.subscription.estado
      });
    }

    // Verificar si tiene suscripción pendiente
    const pendingSubscription = await Subscription.findOne({
      usuario: usuarioId,
      estado: 'waiting_payment'
    });

    res.json({ 
      hasActiveSubscription,
      hasPendingSubscription: !!pendingSubscription,
      plan: null
    });

  } catch (error) {
    console.error('Error verificando suscripción:', error);
    res.status(500).json({ mensaje: 'Error verificando suscripción' });
  }
});

module.exports = router;
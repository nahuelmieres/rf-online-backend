const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generarLinkPagoMP, recibirNotificacionMP } = require('../controllers/mercadoPagoController');
const { 
  crearSuscripcionBasico,
  crearSuscripcionPersonalizado,
  webhookPaypal 
} = require('../controllers/payPalController');

// MercadoPago (mantener para futura implementación)
router.post('/mercadopago/preferencia', verificarToken, generarLinkPagoMP);
router.post('/mercadopago/webhook', recibirNotificacionMP);

// PayPal - Nuevos endpoints para suscripciones
router.post('/paypal/suscripcion/basico', verificarToken, crearSuscripcionBasico);
router.post('/paypal/suscripcion/personalizado', verificarToken, crearSuscripcionPersonalizado);
router.post('/paypal/webhook', webhookPaypal);

// Eliminamos los endpoints viejos de órdenes simples
// router.post('/paypal/orden', verificarToken, generarOrdenPaypal);
// router.post('/paypal/captura', verificarToken, capturarPagoPaypal);

module.exports = router;
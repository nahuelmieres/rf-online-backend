const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generarLinkPagoMP, recibirNotificacionMP } = require('../controllers/mercadoPagoController');
const { generarOrdenPaypal, capturarPagoPaypal, webhookPaypal } = require('../controllers/payPalController');

// MercadoPago
router.post('/mercadopago/preferencia', verificarToken, generarLinkPagoMP);
router.post('/mercadopago/webhook', recibirNotificacionMP);

// PayPal
router.post('/paypal/orden', verificarToken, generarOrdenPaypal);
router.post('/paypal/captura', verificarToken, capturarPagoPaypal);
router.post('/paypal/webhook', webhookPaypal);

module.exports = router;
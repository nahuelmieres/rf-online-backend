const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { generarLinkPagoMP, recibirNotificacionMP } = require('../controllers/pagosController');

router.post('/mercadopago/preferencia', verificarToken, generarLinkPagoMP);

router.post('/mercadopago/webhook', recibirNotificacionMP);



module.exports = router;
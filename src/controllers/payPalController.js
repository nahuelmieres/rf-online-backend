const { crearOrdenPaypal, capturarOrdenPaypal, procesarWebhookPaypal } = require('../services/paypalServices');

// Genero orden de pago PayPal
const generarOrdenPaypal = async (req, res) => {
  try {
    const { monto } = req.body;
    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'Monto inválido' });
    }

    const orden = await crearOrdenPaypal(req.usuario, monto);
    res.status(200).json({ id: orden.id, links: orden.links });
  } catch (error) {
    console.error('Error al generar orden PayPal:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Capturo pago luego de la aprobación del usuario
const capturarPagoPaypal = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ mensaje: 'Falta el ID de la orden' });
    }

    const resultado = await capturarOrdenPaypal(orderId);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al capturar pago PayPal:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Webhook de notificaciones PayPal
const webhookPaypal = async (req, res) => {
  await procesarWebhookPaypal(req, res);
};

module.exports = {
  generarOrdenPaypal,
  capturarPagoPaypal,
  webhookPaypal
};
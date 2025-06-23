const { crearOrdenPaypal, capturarOrdenPaypal, procesarWebhookPaypal } = require('../services/paypalServices');

// Genero la orden de PayPal
const generarOrdenPaypal = async (req, res) => {
  try {
    const { monto } = req.body;
    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'Monto inválido' });
    }

    const orden = await crearOrdenPaypal(monto);
    res.status(200).json(orden);
  } catch (error) {
    console.error('Error al generar orden PayPal:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Capturo el pago cuando el usuario aprueba
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

// Proceso los eventos desde el webhook
const webhookPaypal = async (req, res) => {
  await procesarWebhookPaypal(req, res); // Llama directo al servicio que ya tenés armado
};

module.exports = {
  generarOrdenPaypal,
  capturarPagoPaypal,
  webhookPaypal
};
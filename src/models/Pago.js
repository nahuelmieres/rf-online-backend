const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  externalId: { // preferenceId de MP o orderId de PayPal
    type: String,
    required: true
  },
  paymentId: String, // ID del pago real confirmado
  estado: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado', 'cancelado', 'completado', 'reembolsado'],
    default: 'pendiente'
  },
  monto: {
    type: Number,
    required: true
  },
  moneda: {
    type: String,
    enum: ['UYU', 'USD'],
    default: 'UYU'
  },
  metodo: {
    type: String,
    enum: ['mercadopago', 'paypal'],
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pago', pagoSchema);
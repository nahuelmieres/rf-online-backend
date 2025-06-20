const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  preferenceId: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado'],
    default: 'pendiente'
  },
  monto: Number,
  moneda: String,
  metodo: String,
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pago', pagoSchema);
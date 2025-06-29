const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['cliente', 'coach', 'admin'], default: 'cliente' },
  estadoPago: { type: Boolean, default: false },
  planificacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Planificacion', default: null },
  fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
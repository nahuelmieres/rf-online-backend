const mongoose = require('mongoose');

const planificacionSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  tipo: { type: String, enum: ['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'], required: true },
  semanas: [{ 
    numero: Number,
    bloques: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bloque' }]
  }],
  comentarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comentario' }],
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Planificacion', planificacionSchema);
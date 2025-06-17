const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema({
  autor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  texto: {
    type: String,
    required: true
  },
  creadoEn: {
    type: Date,
    default: Date.now
  },
  planificacion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Planificacion'
  },
  semana: Number, // opcional
  bloque: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bloque'
  }
});

module.exports = mongoose.model('Comentario', comentarioSchema);
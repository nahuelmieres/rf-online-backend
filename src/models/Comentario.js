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
    ref: 'Planificacion',
    required: true
  },
  semana: {
    type: Number,
    required: true,
    min: 1
  },
  dia: {
    type: String,
    enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    required: true
  },
  respuesta: {
    texto: String,
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    fecha: Date
  }
});

module.exports = mongoose.model('Comentario', comentarioSchema);
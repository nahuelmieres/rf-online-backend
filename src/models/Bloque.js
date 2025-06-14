const mongoose = require('mongoose');

const ejercicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  series: Number,
  repeticiones: Number,
  peso: String,
  linkVideo: String
});

const bloqueSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['texto', 'ejercicios'],
    required: true
  },
  contenidoTexto: {
    type: String,
    required: function () {
      return this.tipo === 'texto';
    }
  },
  ejercicios: {
    type: [ejercicioSchema],
    required: function () {
      return this.tipo === 'ejercicios';
    }
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
});

module.exports = mongoose.model('Bloque', bloqueSchema);
const mongoose = require('mongoose');

const ejercicioSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre del ejercicio es requerido'],
    trim: true
  },
  series: {
    type: Number,
    required: true,
    min: [1, 'Debe haber al menos 1 serie']
  },
  repeticiones: {
    type: Number,
    required: true,
    min: [1, 'Debe haber al menos 1 repetición']
  },
  peso: {
    type: String,
    trim: true
  },
  linkVideo: {
    type: String,
    trim: true,
    match: [/^(https?\:\/\/)?(www\.youtube\.com|youtu\.be)\/.+$/, 'Ingresa un link de YouTube válido']
  }
}, { _id: false });

const bloqueSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: {
      values: ['texto', 'ejercicios'],
      message: 'Tipo de bloque inválido'
    },
    required: true,
    immutable: true
  },
  contenidoTexto: {
    type: String,
    trim: true
  },
  ejercicios: [ejercicioSchema],
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    immutable: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, { 
  strict: 'throw',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validación condicional
bloqueSchema.pre('validate', function(next) {
  if (this.tipo === 'texto' && !this.contenidoTexto?.trim()) {
    this.invalidate('contenidoTexto', 'El contenido es requerido para bloques de texto');
  }
  if (this.tipo === 'ejercicios' && (!this.ejercicios || this.ejercicios.length === 0)) {
    this.invalidate('ejercicios', 'Debe incluir al menos un ejercicio');
  }
  next();
});

// Actualizar referencias en planificaciones al guardar
bloqueSchema.post('save', async function(doc) {
  await mongoose.model('Planificacion').updateMany(
    { 'semanas.bloques': doc._id },
    { $set: { 'semanas.$[].bloques.$[elem]': doc._id } },
    { arrayFilters: [{ 'elem': doc._id }] }
  );
});

module.exports = mongoose.model('Bloque', bloqueSchema);
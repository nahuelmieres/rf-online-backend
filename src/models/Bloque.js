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
    type: String,
    required: true
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
  titulo: {
    type: String,
    required: [true, 'El título del bloque es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede tener más de 100 caracteres']
  },
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
  etiquetas: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
    validate: {
      validator: function (v) {
        return v.trim().length > 0;
      },
      message: 'Las etiquetas no pueden estar vacías'
    }
  }],
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
bloqueSchema.pre('validate', function (next) {
  if (this.tipo === 'texto' && !this.contenidoTexto?.trim()) {
    this.invalidate('contenidoTexto', 'El contenido es requerido para bloques de texto');
  }
  if (this.tipo === 'ejercicios' && (!this.ejercicios || this.ejercicios.length === 0)) {
    this.invalidate('ejercicios', 'Debe incluir al menos un ejercicio');
  }
  next();
});

// Antes de guardar, filtramos etiquetas vacías
bloqueSchema.pre('save', function (next) {
  if (this.etiquetas && Array.isArray(this.etiquetas)) {
    this.etiquetas = this.etiquetas
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  next();
});

// Añadir esto al esquema de Bloque
bloqueSchema.post('deleteOne', { document: true }, async function () {
  try {
    await mongoose.model('Planificacion').updateMany(
      {},
      { $pull: { "semanas.$[].dias.$[].bloques": this._id } }
    );
    console.log(`Referencias al bloque ${this._id} limpiadas en todas las planificaciones`);
  } catch (error) {
    console.error(`Error limpiando referencias del bloque ${this._id}:`, error);
  }
});

module.exports = mongoose.model('Bloque', bloqueSchema);
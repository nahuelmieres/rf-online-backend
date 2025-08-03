const mongoose = require('mongoose');

const planificacionSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  tipo: { 
    type: String, 
    enum: {
      values: ['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'],
      message: 'Tipo de planificación inválido'
    },
    required: true
  },
  categoria: {
    type: String,
    enum: {
      values: ['basica', 'personalizada'],
      message: 'Categoría inválida'
    },
    required: true,
    default: 'basica'
  },
  usuarioAsignado: { // Referencia al usuario asignado UNICAMENTE EN PLANIFICACIONES PERSONALIZADAS
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },
  semanas: [{
    numero: {
      type: Number,
      required: true,
      min: [1, 'El número de semana debe ser al menos 1']
    },
    dias: [{
      nombre: {
        type: String,
        enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        required: true
      },
      bloques: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bloque'
      }],
      descanso: {
        type: Boolean,
        default: false
      }
    }]
  }],
  creadoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario',
    required: true,
    immutable: true
  },
  creadoPorSnapshot: {
    nombre: String,
    email: String,
    rol: String
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now,
    immutable: true
  }
}, { 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  validateBeforeSave: true
});

// Middleware para snapshot del creador
planificacionSchema.pre('save', async function(next) {
  if (this.isNew && !this.creadoPorSnapshot) {
    try {
      const creador = await mongoose.model('Usuario').findById(this.creadoPor);
      if (creador) {
        this.creadoPorSnapshot = {
          nombre: creador.nombre,
          email: creador.email,
          rol: creador.rol
        };
      }
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Middleware para limpiar referencias cuando se elimina un bloque
planificacionSchema.statics.limpiarReferencias = async function(bloqueId) {
  await this.updateMany(
    {},
    { $pull: { "semanas.$[].dias.$[].bloques": bloqueId } }
  );
};

// Índices para mejor performance
planificacionSchema.index({ creadoPor: 1 });
planificacionSchema.index({ tipo: 1 });
planificacionSchema.index({ 'semanas.dias.nombre': 1 });
planificacionSchema.index({ 'semanas.dias.bloques': 1 });

// Middleware para eliminar referencias cuando se borra un bloque
planificacionSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await mongoose.model('Planificacion').limpiarReferencias(doc._id);
  }
});

module.exports = mongoose.model('Planificacion', planificacionSchema);
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
        ref: 'Bloque',
        validate: {
          validator: async v => await mongoose.model('Bloque').exists({ _id: v }),
          message: 'El bloque referenciado no existe'
        }
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
  toObject: { virtuals: true }
});

// Virtual para poblar bloques
planificacionSchema.virtual('diasConBloques', {
  ref: 'Bloque',
  localField: 'semanas.dias.bloques',
  foreignField: '_id'
});

// Middleware para snapshot del creador
planificacionSchema.pre('save', async function(next) {
  if (this.isNew && !this.creadoPorSnapshot) {
    const creador = await mongoose.model('Usuario').findById(this.creadoPor);
    if (creador) {
      this.creadoPorSnapshot = {
        nombre: creador.nombre,
        email: creador.email,
        rol: creador.rol
      };
    }
  }
  next();
});

// Índices para mejor performance
planificacionSchema.index({ creadoPor: 1 });
planificacionSchema.index({ tipo: 1 });
planificacionSchema.index({ 'semanas.dias.nombre': 1 });

module.exports = mongoose.model('Planificacion', planificacionSchema);
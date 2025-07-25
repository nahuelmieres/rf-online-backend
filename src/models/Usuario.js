const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: { 
    type: String, 
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido']
  },
  password: { 
    type: String, 
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  rol: { 
    type: String, 
    enum: {
      values: ['cliente', 'coach', 'admin'],
      message: 'Rol inválido'
    },
    default: 'cliente'
  },
  estadoPago: { 
    type: Boolean, 
    default: false 
  },
  planificacion: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Planificacion' 
  },
  fechaRegistro: { 
    type: Date, 
    default: Date.now,
    immutable: true
  }
}, { 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejor performance
usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ planificacion: 1 });
;

module.exports = mongoose.model('Usuario', usuarioSchema);
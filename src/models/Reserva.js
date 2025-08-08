const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fecha: {
    type: Date,
    required: true,
    index: true
  },
  tipo: {
    type: String,
    enum: ['salud', 'openbox'],
    required: true
  },
  sucursal: {
    type: String,
    enum: ['malvin', 'blanqueada'],
    required: true
  },
  estado: {
    type: String,
    enum: ['activa', 'cancelada'],
    default: 'activa'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimización
reservaSchema.index({ fecha: 1, sucursal: 1, tipo: 1 });
reservaSchema.index({ usuario: 1, fecha: 1 });

// Middleware para validar fecha máxima (hasta 2 semanas adelante)
reservaSchema.pre('save', function(next) {
  const dosSemanas = new Date();
  dosSemanas.setDate(dosSemanas.getDate() + 14);
  
  if (this.fecha > dosSemanas) {
    const error = new Error('No se puede reservar más de 2 semanas adelante');
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Reserva', reservaSchema);
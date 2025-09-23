const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    // Solo requerida si NO hay googleId (cuenta local)
    required: [function () { return !this.googleId; }, 'La contraseña es requerida para cuentas locales'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false
  },
  rol: {
    type: String,
    enum: { values: ['cliente', 'coach', 'admin'], message: 'Rol inválido' },
    default: 'cliente'
  },
  planPersonalizado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Planificacion',
    default: null
  },
  fechaVencimiento: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  fechaRegistro: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  aceptaTerminos: {
    type: Boolean,
    required: [true, 'Debe aceptar los términos y condiciones'],
    immutable: true
  },
  resetTokenHash: { type: String, default: null },
  resetTokenExp: { type: Date, default: null },

  // Si existe, es cuenta Google
  googleId: { type: String, index: true, sparse: true },
  avatarUrl: String,

  // Para auditar proveedor
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual
usuarioSchema.virtual('estadoPago').get(function () {
  if (this.rol === 'admin' || this.rol === 'coach') return true;
  return this.fechaVencimiento && this.fechaVencimiento > new Date();
});

// Índices
usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ planPersonalizado: 1 });

// Middleware para hashear password antes de guardar
usuarioSchema.pre('save', async function(next) {
  // si no hay password o no cambió, seguimos
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (e) {
    next(e);
  }
});


module.exports = mongoose.model('Usuario', usuarioSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

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
    validate: {
      validator: function (v) {
        return validator.isEmail(v);
      },
      message: 'Por favor ingresa un email válido'
    },
    maxlength: [100, 'El email no puede exceder 100 caracteres'],
    trim: true,
    index: true,
    sparse: true
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
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  planRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlanRequest',
    default: null
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
  
  // Para manejo de sesiones (sesión única por usuario)
  sessionToken: {
    type: String,
    default: null,
    select: false
  },
  lastSessionDate: {
    type: Date,
    default: null
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual - ACTUALIZADO para verificar suscripción correctamente
usuarioSchema.virtual('estadoPago').get(function () {
  // Admin y coach siempre tienen acceso
  if (this.rol === 'admin' || this.rol === 'coach') return true;

  // Si subscription está poblado (viene con populate)
  if (this.subscription && typeof this.subscription === 'object' && this.subscription.estado) {
    return this.subscription.estado === 'active' && this.subscription.currentPeriodEnd > new Date();
  }

  // Si subscription no está poblado, no podemos saber (retornamos false por seguridad)
  return false;
});

// Índices
usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ planPersonalizado: 1 });

// Middleware para hashear password antes de guardar
usuarioSchema.pre('save', async function (next) {
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
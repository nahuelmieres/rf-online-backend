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
    required: [function () { return !this.googleId; }, 'La contraseña es requerida para cuentas locales'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false
  },
  rol: {
    type: String,
    enum: { values: ['cliente', 'coach', 'admin', 'reservas'], message: 'Rol inválido' }, // NUEVO: rol 'reservas'
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

  googleId: { type: String, index: true, sparse: true },
  avatarUrl: String,
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  
  sessionToken: {
    type: String,
    default: null,
    select: false
  },
  lastSessionDate: {
    type: Date,
    default: null
  },

  // NUEVO: Para usuarios creados por admin (pago manual)
  pagoManual: {
    type: Boolean,
    default: false
  },
  creadoPorAdmin: {
    type: Boolean,
    default: false
  },
  requiereCambioPassword: {
    type: Boolean,
    default: false
  },
  passwordTemporal: {
    type: String,
    select: false,
    default: null
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual - ACTUALIZADO
usuarioSchema.virtual('estadoPago').get(function () {
  // Admin y coach siempre tienen acceso
  if (this.rol === 'admin' || this.rol === 'coach') return true;

  // NUEVO: Usuarios de solo reservas con pago manual
  if (this.rol === 'reservas' && this.pagoManual) return true;

  // Verificar suscripción activa
  if (this.subscription && typeof this.subscription === 'object' && this.subscription.estado) {
    return this.subscription.estado === 'active' && this.subscription.currentPeriodEnd > new Date();
  }

  return false;
});

usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ planPersonalizado: 1 });

usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
const mongoose = require('mongoose');

// --- Helpers ---
function trimOrNull(v) {
  return typeof v === 'string' ? v.trim() : v;
}

// Validador condicional para esfuerzoPercibido según escala
function esfuerzoValidator(v) {
  if (v == null) return true; // permitir opcional
  const escala = (this.escala || '').toUpperCase();
  if (!Number.isFinite(v)) return false;

  // Ajustar rangos si se prefiere otra convención
  if (escala === 'RIR') return v >= 0 && v <= 5;
  if (escala === 'RPE') return v >= 1 && v <= 10; // ej.: si se quiere cambiar a 6–10, cambiar acá
  return true;
}

// --- Ejercicio ---
const ejercicioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del ejercicio es requerido'],
    trim: true,
    set: trimOrNull
  },
  series: {
    type: Number,
    required: true,
    min: [1, 'Debe haber al menos 1 serie'],
    validate: {
      validator: Number.isInteger,
      message: 'Series debe ser un entero'
    }
  },
  repeticiones: {
    type: String,
    required: true,
    trim: true,
    set: trimOrNull
  },

  // Reemplazo de "peso"
  escala: {
    type: String,
    enum: {
      values: ['RPE', 'RIR'],
      message: 'Escala inválida (usa RPE o RIR)'
    },
    set: v => (v ? String(v).trim().toUpperCase() : v)
  },
  esfuerzoPercibido: {
    type: Number,
    validate: {
      validator: esfuerzoValidator,
      message: 'esfuerzoPercibido fuera de rango para la escala'
    },
    // redondeo a 0.5 si viene con decimales
    set: v => (typeof v === 'number' ? Math.round(v * 2) / 2 : v)
  },

  linkVideo: {
    type: String,
    trim: true,
    set: trimOrNull,
    validate: {
      validator: (v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          // acepta youtube.com, youtu.be, m.youtube.com, shorts, etc.
          return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname);
        } catch {
          return false;
        }
      },
      message: 'Ingresa un link de YouTube válido'
    }
  }
}, { _id: false });

// Requerir coherencia: si viene uno, que venga el otro
ejercicioSchema.pre('validate', function (next) {
  const tieneEscala = !!this.escala;
  const tieneEsfuerzo = this.esfuerzoPercibido != null;

  if (tieneEscala ^ tieneEsfuerzo) {
    this.invalidate('escala', 'Si definís esfuerzoPercibido, también debés definir escala (y viceversa)');
  }
  next();
});

// Virtual útil: estimo RPE cuando guardás RIR (sin duplicar datos)
ejercicioSchema.virtual('rpeEstimado').get(function () {
  if (this.escala === 'RPE') return this.esfuerzoPercibido ?? null;
  if (this.escala === 'RIR' && this.esfuerzoPercibido != null) {
    return Math.max(1, Math.min(10, 10 - this.esfuerzoPercibido));
  }
  return null;
});

// --- Bloque ---
const bloqueSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título del bloque es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede tener más de 100 caracteres'],
    set: trimOrNull
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
    trim: true,
    set: trimOrNull
  },
  ejercicios: { type: [ejercicioSchema], default: [] },
  etiquetas: {
    type: [String],
    default: [],
    set: (arr) => Array.isArray(arr)
      ? [...new Set(arr.map(s => String(s).trim().toLowerCase()).filter(s => s.length > 0 && s.length <= 30))]
      : []
  },
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
  timestamps: true, // createdAt / updatedAt
  toJSON: {
    virtuals: true,
    transform: (_, ret) => { delete ret.__v; return ret; }
  },
  toObject: { virtuals: true }
});

// Validación condicional a nivel bloque
bloqueSchema.pre('validate', function (next) {
  if (this.tipo === 'texto' && !this.contenidoTexto?.trim()) {
    this.invalidate('contenidoTexto', 'El contenido es requerido para bloques de texto');
  }
  if (this.tipo === 'ejercicios' && (!this.ejercicios || this.ejercicios.length === 0)) {
    this.invalidate('ejercicios', 'Debe incluir al menos un ejercicio');
  }
  next();
});

// Limpieza extra de etiquetas (por si acaso)
bloqueSchema.pre('save', function (next) {
  if (this.etiquetas && Array.isArray(this.etiquetas)) {
    this.etiquetas = this.etiquetas
      .map(tag => String(tag).trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 30);
  }
  next();
});

// Índices
bloqueSchema.index({ creadoPor: 1, fechaCreacion: -1 });
bloqueSchema.index({ etiquetas: 1 });

// Hook para limpiar referencias 
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
// Si te sirve exponer el schema de ejercicio para tests u otros modelos:
// module.exports.EjercicioSchema = ejercicioSchema;
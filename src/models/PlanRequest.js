const mongoose = require('mongoose');

const planRequestSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  estado: {
    type: String, 
    enum: ['pending', 'assigned', 'delivered', 'cancelled'],
    default: 'pending'
  },
  questionnaire: {
    objetivo: {
      type: String,
      required: [true, 'El objetivo es requerido'],
      trim: true,
      maxlength: [100, 'El objetivo no puede exceder 100 caracteres']
    },
    nivel: {
      type: String,
      required: [true, 'El nivel es requerido'],
      enum: {
        values: ['principiante', 'intermedio', 'avanzado'],
        message: 'Nivel inválido. Debe ser: principiante, intermedio o avanzado'
      }
    },
    lesiones: {
      type: String,
      required: [true, 'La información sobre lesiones es requerida'],
      trim: true,
      maxlength: [500, 'La información de lesiones no puede exceder 500 caracteres']
    },
    equipamiento: {
      type: String,
      required: [true, 'El equipamiento disponible es requerido'],
      trim: true,
      maxlength: [200, 'El equipamiento no puede exceder 200 caracteres']
    },
    disponibilidad: {
      diasPorSemana: {
        type: Number,
        required: [true, 'Los días por semana son requeridos'],
        min: [1, 'Mínimo 1 día por semana'],
        max: [7, 'Máximo 7 días por semana']
      },
      minutosPorDia: {
        type: Number,
        required: [true, 'Los minutos por día son requeridos'],
        min: [15, 'Mínimo 15 minutos por día'],
        max: [180, 'Máximo 180 minutos por día']
      },
      diasPreferidos: {
        type: [String],
        required: [true, 'Los días preferidos son requeridos'],
        validate: {
          validator: function(dias) {
            return dias && dias.length > 0 && dias.length <= 7;
          },
          message: 'Debe tener al menos 1 día preferido y máximo 7'
        }
      }
    },
    preferencias: {
      type: String,
      required: [true, 'Las preferencias son requeridas'],
      trim: true,
      maxlength: [500, 'Las preferencias no pueden exceder 500 caracteres']
    }
  },
  planificacionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Planificacion',
    default: null
  },
  asignadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  timeline: [{
    event: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('PlanRequest', planRequestSchema);
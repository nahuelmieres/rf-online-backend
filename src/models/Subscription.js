const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  estado: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'paused', 'expired', 'waiting_payment'],
    default: 'waiting_payment'
  },
  plan: {
    type: String,
    enum: ['basico', 'personalizado'],
    required: true
  },
  provider: {
    type: String,
    enum: ['paypal', 'mercadopago'],
    required: true
  },
  providerSubscriptionId: {
    type: String, // ID de la suscripción en PayPal/MP
    required: true
  },
  precio: {
    type: Number,
    required: true // 31.99 básico, 99.99 personalizado
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  }
},
  {
    timestamps: true
  })
subscriptionSchema.index(
  { usuario: 1, estado: 1 },
  {
    unique: true,
    partialFilterExpression: {
      estado: { $in: ['active', 'waiting_payment'] }
    }
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
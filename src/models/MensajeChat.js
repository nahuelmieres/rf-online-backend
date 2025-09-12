const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true 
  },
  text: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  readBy: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario' 
    },
    readAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, {
  timestamps: true
});

// Índices para mejor performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ read: 1 });

module.exports = mongoose.model('MensajeChat', messageSchema);
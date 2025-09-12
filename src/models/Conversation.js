const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario', 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['cliente', 'coach', 'admin'], 
      required: true 
    },
    lastRead: { 
      type: Date, 
      default: Date.now 
    }
  }],
  lastMessage: {
    text: String,
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Usuario' 
    },
    timestamp: Date
  },
  unreadCount: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Índice para búsquedas eficientes
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
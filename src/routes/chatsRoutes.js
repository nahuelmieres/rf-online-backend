const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  getOrCreateConversation,
  sendMessage,
  getMessageHistory,
  getUserConversations,
  markAsRead,
  deleteConversation
} = require('../controllers/chatsController');

// Obtener o crear conversación
router.post('/conversations', verificarToken, getOrCreateConversation);

// Enviar mensaje
router.post('/messages', verificarToken, sendMessage);

// Obtener historial de mensajes
router.get('/conversations/:conversationId/messages', verificarToken, getMessageHistory);

// Obtener conversaciones del usuario
router.get('/conversations/user/:userId', verificarToken, getUserConversations);

// Marcar conversación como leída
router.post('/conversations/:conversationId/read', verificarToken, markAsRead);

// Eliminar conversación
router.delete('/conversations/:conversationId', verificarToken, deleteConversation);

module.exports = router;
const express = require('express');
const router = express.Router();
const {verificarToken, verificarSuscripcionActiva} = require('../middlewares/authMiddleware');
const {
  getOrCreateConversation,
  sendMessage,
  getMessageHistory,
  getUserConversations,
  markAsRead,
  deleteConversation
} = require('../controllers/chatsController');

// Obtener o crear conversación
router.post('/conversations', verificarToken, verificarSuscripcionActiva, getOrCreateConversation);

// Enviar mensaje
router.post('/messages', verificarToken, verificarSuscripcionActiva, sendMessage);

// Obtener historial de mensajes
router.get('/conversations/:conversationId/messages', verificarToken, verificarSuscripcionActiva, getMessageHistory);

// Obtener conversaciones del usuario
router.get('/conversations/user/:userId', verificarToken, verificarSuscripcionActiva, getUserConversations);

// Marcar conversación como leída
router.post('/conversations/:conversationId/read', verificarToken, verificarSuscripcionActiva, markAsRead);

// Eliminar conversación
router.delete('/conversations/:conversationId', verificarToken, verificarSuscripcionActiva, deleteConversation);

module.exports = router;
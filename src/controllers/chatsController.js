const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const MensajeChat = require('../models/MensajeChat');
const Usuario = require('../models/Usuario');

// Crear o obtener conversación existente
const getOrCreateConversation = async (req, res) => {
  const { userId1, userId2 } = req.body;

  if (!userId1 || !userId2) {
    return res.status(400).json({ mensaje: 'Faltan IDs de usuarios' });
  }
  try {
    // Buscar conversación existente
    let conversation = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { userId: userId1 } },
          { $elemMatch: { userId: userId2 } }
        ]
      },
      isActive: true
    }).populate('participants.userId', 'nombre email rol');

    // Si no existe, crear nueva
    if (!conversation) {
      const [user1, user2] = await Promise.all([
        Usuario.findById(userId1),
        Usuario.findById(userId2)
      ]);

      if (!user1 || !user2) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      conversation = new Conversation({
        participants: [
          { userId: userId1, role: user1.rol },
          { userId: userId2, role: user2.rol }
        ]
      });

      await conversation.save();
      await conversation.populate('participants.userId', 'nombre email rol');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error en getOrCreateConversation:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

// Enviar mensaje
const sendMessage = async (req, res) => {
  const { conversationId, senderId, text } = req.body;

  if (!conversationId || !senderId || !text) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }
  try {
    // Crear el mensaje
    const message = new MensajeChat({
      conversationId,
      senderId,
      text
    });

    await message.save();

    // Actualizar última conversación
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: {
          text: text.length > 50 ? text.substring(0, 50) + '...' : text,
          senderId: senderId,
          timestamp: new Date()
        },
        $inc: { unreadCount: 1 }
      }
    );

    // Populate para obtener información del sender
    await message.populate('senderId', 'nombre email rol');

    return res.json(message);
  } catch (error) {
    console.error('Error en sendMessage:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

// Obtener historial de mensajes
// controllers/chatsController.js
const getMessageHistory = async (req, res) => {
  const { conversationId } = req.params;       // <-- params
  const page  = parseInt(req.query.page ?? 1);  // <-- query
  const limit = parseInt(req.query.limit ?? 50);

  if (!conversationId) {
    return res.status(400).json({ mensaje: 'Falta ID de conversación' });
  }

  try {
    const skip = (page - 1) * limit;
    const messages = await MensajeChat.find({ conversationId })
      .populate('senderId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json(messages.reverse());
  } catch (error) {
    console.error('Error en getMessageHistory:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Marcar mensajes como leídos
const markAsRead = async (req, res) => {
  const conversationId = req.params.conversationId || req.body?.conversationId;
  // si tu middleware mete req.user.id podés preferirlo; si no, usa el body:
  const userId = (req.user && req.user.id) || req.body?.userId;

  if (!conversationId || !userId) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ mensaje: 'IDs inválidos' });
  }

  try {
    const convId = new mongoose.Types.ObjectId(conversationId);
    const readerId = new mongoose.Types.ObjectId(userId);

    // 1) Marcar como leídos los mensajes del OTRO usuario
    const msgResult = await MensajeChat.updateMany(
      {
        conversationId: convId,
        senderId: { $ne: readerId },
        read: false,
      },
      {
        $set: { read: true },
        $push: { readBy: { userId: readerId, readAt: new Date() } },
      }
    );

    // 2) Poner unreadCount=0 y actualizar lastRead del lector (sin arrayFilters)
    const convResult = await Conversation.updateOne(
      { _id: convId, 'participants.userId': readerId },
      { $set: { unreadCount: 0, 'participants.$.lastRead': new Date() } }
    );

    return res.json({
      ok: true,
      mensaje: 'Mensajes marcados como leídos',
      modifiedMessages: msgResult.modifiedCount ?? msgResult.nModified,
      convModified: convResult.modifiedCount ?? convResult.nModified,
    });
  } catch (error) {
    console.error('Error en markAsRead:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Obtener conversaciones de un usuario
const getUserConversations = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ mensaje: 'Falta ID de usuario' });
  }
  try {
    const conversations = await Conversation.find({
      'participants.userId': userId,
      isActive: true
    })
      .populate('participants.userId', 'nombre email rol')
      .populate('lastMessage.senderId', 'nombre')
      .sort({ updatedAt: -1 });

    return res.json(conversations);
  } catch (error) {
    console.error('Error en getUserConversations:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

// Eliminar conversación (marcar como inactiva)
const deleteConversation = async (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ mensaje: 'Falta ID de conversación' });
  }
  try {
    await Conversation.findByIdAndUpdate(conversationId, { isActive: false });
    return res.json({ mensaje: 'Conversación eliminada' });
  } catch (error) {
    console.error('Error en deleteConversation:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getMessageHistory,
  markAsRead,
  getUserConversations,
  deleteConversation
};
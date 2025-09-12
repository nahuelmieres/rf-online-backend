const Conversation = require('../models/Conversation');
const MensajeChat = require('../models/MensajeChat');
const Usuario = require('../models/Usuario');

// Crear o obtener conversación existente
const getOrCreateConversation = async (req, res) => {
  const { userId1, userId2 } = req.body; // IDs de los usuarios involucrados

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
      // Obtener información de los usuarios
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

    return conversation;
  } catch (error) {
    console.error('Error en getOrCreateConversation:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
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

    return message;
  } catch (error) {
    console.error('Error en sendMessage:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

// Obtener historial de mensajes
const getMessageHistory = async (req, res) => {
  const { conversationId, page = 1, limit = 50 } = req.query;
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

    return messages.reverse(); // Ordenar de más antiguo a más nuevo
  } catch (error) {
    console.error('Error en getMessageHistory:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

// Marcar mensajes como leídos
const markAsRead = async (req, res) => {
  const { conversationId, userId } = req.body;
  if (!conversationId || !userId) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }
  try {
    // Marcar mensajes como leídos
    await MensajeChat.updateMany(
      {
        conversationId,
        senderId: { $ne: userId }, // No marcar los propios
        read: false
      },
      {
        $set: { read: true },
        $push: {
          readBy: {
            userId: userId,
            readAt: new Date()
          }
        }
      }
    );

    // Resetear contador de no leídos
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: { unreadCount: 0 },
        $set: {
          'participants.$[elem].lastRead': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.userId': userId }]
      }
    );

    return { mensaje: 'Mensajes marcados como leídos' };
  } catch (error) {
    console.error('Error en markAsRead:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

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

    return conversations;
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
    return { mensaje: 'Conversación eliminada' };
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
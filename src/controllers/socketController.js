const Conversation = require('../models/Conversation');
const MensajeChat = require('../models/MensajeChat');

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.userId, socket.userName);

    // Unir al usuario a su sala personal
    socket.join(`user_${socket.userId}`);

    // Manejar unirse a conversación
    socket.on('join-conversation', async (conversationId) => {
      try {
        // Verificar que el usuario es participante
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.participants.some(p => p.userId.toString() === socket.userId)) {
          socket.join(`conversation_${conversationId}`);
          console.log(`Usuario ${socket.userId} unido a conversación ${conversationId}`);
        }
      } catch (error) {
        console.error('Error al unirse a conversación:', error);
      }
    });

    // Manejar enviar mensaje (para tiempo real)
    socket.on('send-message-real-time', async (data) => {
      try {
        const { conversationId, text } = data;

        // Verificar permisos
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some(p => p.userId.toString() === socket.userId)) {
          socket.emit('error', { message: 'No autorizado' });
          return;
        }

        // Crear mensaje
        const message = new MensajeChat({
          conversationId,
          senderId: socket.userId,
          text
        });

        await message.save();

        // Actualizar conversación
        await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: {
              text: text.length > 50 ? text.substring(0, 50) + '...' : text,
              senderId: socket.userId,
              timestamp: new Date()
            },
            $inc: { unreadCount: 1 }
          }
        );

        const populatedMessage = await MensajeChat.findById(message._id)
          .populate('senderId', 'nombre email rol');

        // Emitir a todos en la conversación
        io.to(`conversation_${conversationId}`).emit('new-message', populatedMessage);

      } catch (error) {
        console.error('Error enviando mensaje en tiempo real:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('Usuario desconectado:', socket.userId);
    });
  });
};

module.exports = { initializeSocket };
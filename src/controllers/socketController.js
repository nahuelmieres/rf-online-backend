const Conversation = require('../models/Conversation');
const MensajeChat = require('../models/MensajeChat');

const roomUser = (id) => `user:${String(id)}`;
const roomConv = (id) => `conversation:${String(id)}`;

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    // El auth middleware debería setear al menos uno de estos:
    const userId =
      String(
        socket.userId ||
        socket.user?.id ||
        socket.user?._id ||
        socket.handshake?.auth?.userId ||
        ''
      );

    if (!userId) {
      // Sin identidad no dejamos el socket conectado
      try { socket.disconnect(true); } catch { }
      return;
    }

    // Sala personal para notificaciones/badges
    socket.join(roomUser(userId));
    // console.log('[socket] connected:', userId, 'rooms=', socket.rooms);

    // Unirse a una conversación (acepta string o { conversationId })
    socket.on('join-conversation', async (payload) => {
      try {
        const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
        if (!conversationId) return;

        const conv = await Conversation.findById(conversationId).select('participants');
        const isParticipant = !!conv && (conv.participants || [])
          .some(p => String(p.userId) === String(userId));
        if (!isParticipant) return;

        // Join a ambas rooms
        socket.join(`conversation:${conversationId}`);
        socket.join(String(conversationId));

        socket.emit('joined-conversation', { conversationId: String(conversationId) });
      } catch (err) {
        console.error('[socket] join-conversation error:', err);
      }
    });


    // Salir de una conversación (acepta string o { conversationId })
    socket.on('leave-conversation', (payload) => {
      const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
      if (!conversationId) return;
      socket.leave(roomConv(conversationId));
      socket.emit('left-conversation', { conversationId: String(conversationId) });
      // console.log(`[socket] ${userId} left`, roomConv(conversationId));
    });

    // Enviar mensaje en tiempo real
    socket.on('send-message-real-time', async (data, cb) => {
      try {
        const conversationId = data?.conversationId;
        const text = (data?.text || '').trim();

        if (!conversationId || !text) {
          const msg = 'Datos inválidos';
          cb?.({ ok: false, error: msg });
          return;
        }

        // Verificar que sea participante
        const conv = await Conversation.findById(conversationId).select('participants');
        const isParticipant = !!conv && (conv.participants || [])
          .some(p => String(p.userId) === String(userId));
        if (!isParticipant) {
          const msg = 'No autorizado';
          cb?.({ ok: false, error: msg });
          return;
        }

        // Crear mensaje
        const message = new MensajeChat({
          conversationId,
          senderId: userId,
          text
        });
        await message.save();

        // Actualizar conversación (último mensaje + unread global)
        await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: {
              text: text.length > 50 ? text.slice(0, 50) + '...' : text,
              senderId: userId,
              timestamp: new Date()
            },
            $inc: { unreadCount: 1 }
          }
        );

        // Cargar datos mínimos para el front
        const populated = await MensajeChat.findById(message._id)
          .select('_id conversationId senderId text createdAt read readBy')
          .lean();

        // Normalizar IDs a string para comparar en el front
        const payload = {
          _id: String(populated._id),
          conversationId: String(populated.conversationId),
          senderId: String(populated.senderId),
          text: populated.text,
          createdAt: populated.createdAt,
          read: !!populated.read,
          readBy: (populated.readBy || []).map(x => ({ ...x, userId: String(x.userId) })),
        };

        // Emitir a la sala de la conversación (usuarios con esa conversación abierta)
        io.to(roomConv(conversationId)).emit('new-message', payload);

        // Emitir a salas personales de destinatarios (para actualizar listas/badges)
        const recipients = (conv?.participants || [])
          .map(p => String(p.userId))
          .filter(uid => uid !== String(userId));

        recipients.forEach(uid => {
          io.to(roomUser(uid)).emit('new-message', payload);
        });

        cb?.({ ok: true, data: payload });
      } catch (error) {
        console.error('[socket] send-message-real-time error:', error);
        cb?.({ ok: false, error: 'Error enviando mensaje' });
      }
    });

    socket.on('disconnect', () => {
      // console.log('[socket] disconnected:', userId);
    });
  });
};

module.exports = { initializeSocket };
const jwt = require('jsonwebtoken');

const verificarTokenSocket = (socket, next) => {
  // Los sockets envían el token en el handshake, no en headers
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adjuntar información del usuario al socket
    socket.userId = decoded.id;
    socket.userRole = decoded.rol;
    socket.userName = decoded.nombre;
    socket.usuario = decoded; // Mantener consistencia con tu middleware
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = verificarTokenSocket;
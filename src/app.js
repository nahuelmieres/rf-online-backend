const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Importar middlewares
const verificarTokenSocket = require('./middlewares/socketAuthMiddleware');
const { initializeSocket } = require('./controllers/socketController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(morgan('dev'));

// Crear servidor HTTP para Socket.io
const server = http.createServer(app);

// Configurar Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Usar el middleware de autenticación para sockets
io.use(verificarTokenSocket);

// Inicializar controlador de socket (manejo de eventos)
initializeSocket(io);

// Hacer que io esté disponible en las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas
app.get('/', (req, res) => {
  res.send('🚀 RF Online backend funcionando como loco!');
});

// Importar rutas
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/planificaciones', require('./routes/planificacionesRoutes'));
app.use('/api/bloques', require('./routes/bloquesRoutes'));
app.use('/api/comentarios', require('./routes/comentariosRoutes'));
app.use('/api/pagos', require('./routes/pagosRoutes'));
app.use('/api/reservas', require('./routes/reservasRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/foros', require('./routes/forosRoutes'));

try {
  app.use('/api/chat', require('./routes/chatsRoutes'));
  console.log('✅ chatsRoutes cargado');
} catch (error) {
  console.error('❌ ERROR en chatsRoutes:', error.message);
}


// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ 
    mensaje: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

// Ruta para 404
app.use('*', (req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Exportar server en lugar de app
module.exports = { app, server, io };
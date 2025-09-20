const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const verificarTokenSocket = require('./middlewares/socketAuthMiddleware');
const { initializeSocket } = require('./controllers/socketController');

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(morgan('dev'));

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // <-- chequeá este origin
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// auth de sockets
io.use(verificarTokenSocket);

// eventos de sockets
initializeSocket(io);

// para usar io en controladores HTTP
app.use((req, res, next) => { req.io = io; next(); });

// Rutas
app.get('/', (req, res) => res.send('🚀 RF Online backend funcionando como loco!'));
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/planificaciones', require('./routes/planificacionesRoutes'));
app.use('/api/bloques', require('./routes/bloquesRoutes'));
app.use('/api/comentarios', require('./routes/comentariosRoutes'));
app.use('/api/pagos', require('./routes/pagosRoutes'));
app.use('/api/reservas', require('./routes/reservasRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/foros', require('./routes/forosRoutes'));
app.use('/api/chat', require('./routes/chatsRoutes'));

// errores
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

app.use('*', (req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

module.exports = { app, server, io };
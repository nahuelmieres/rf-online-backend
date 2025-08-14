const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // *opcional* para loguear requests
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
// New middleware para capturar el body original
// Esto es necesario para validar firmas de webhooks de PayPal y MercadoPago
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // Guardo el body original para validación
  }
}));
app.use(morgan('dev')); 

// Rutas
app.get('/', (req, res) => {
  res.send('🚀 RF Online backend funcionando como loco!');
});

// Acá se van a importar las rutas reales más adelante
app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/planificaciones', require('./routes/planificacionesRoutes'));
app.use('/api/bloques', require('./routes/bloquesRoutes'));
app.use('/api/comentarios', require('./routes/comentariosRoutes'));
app.use('/api/pagos', require('./routes/pagosRoutes'));
app.use('/api/reservas', require('./routes/reservasRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));


module.exports = app;

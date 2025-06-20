const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // *opcional* para loguear requests
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
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

module.exports = app;

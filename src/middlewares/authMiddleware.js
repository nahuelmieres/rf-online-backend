const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Subscription = require('../models/Subscription');

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verificamos si existe el header Authorization y empieza con "Bearer"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      mensaje: 'Token no proporcionado',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // NUEVO: Verificar sessionToken en BD
    const usuario = await Usuario.findById(decoded.id).select('+sessionToken');
    
    if (!usuario) {
      return res.status(401).json({ 
        mensaje: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // NUEVO: Validar que el sessionToken del JWT coincida con el de la BD
    if (decoded.sessionToken !== usuario.sessionToken) {
      return res.status(401).json({ 
        mensaje: 'Tu sesión ha expirado. Por favor, volvé a iniciar sesión.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Dejamos disponible para el controlador
    req.usuario = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
      nombre: decoded.nombre,
      planPersonalizado: decoded.planPersonalizado
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        mensaje: 'Token expirado. Por favor, volvé a iniciar sesión.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Error en verificarToken:', error);
    return res.status(401).json({ 
      mensaje: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware para verificar suscripción activa - ACTUALIZADO
const verificarSuscripcionActiva = async (req, res, next) => {
  try {
    const { id: usuarioId, rol } = req.usuario;

    // Buscar usuario y popular subscription para que funcione el virtual
    const usuario = await Usuario.findById(usuarioId)
      .populate('subscription')
      .lean({ virtuals: true }); // IMPORTANTE: lean con virtuals

    if (!usuario) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Usar el virtual estadoPago que ya tiene toda la lógica
    if (!usuario.estadoPago) {
      return res.status(403).json({
        mensaje: 'Se requiere una suscripción activa para acceder a este contenido',
        code: 'SUBSCRIPTION_REQUIRED',
        redirectTo: '/suscripcion'
      });
    }

    // Opcional: Agregar info de la suscripción al request
    if (usuario.subscription && typeof usuario.subscription === 'object') {
      req.subscription = usuario.subscription;
    }

    next();
  } catch (error) {
    console.error('Error verificando suscripción:', error);
    res.status(500).json({ mensaje: 'Error verificando suscripción' });
  }
};

module.exports = { 
  verificarToken, 
  verificarSuscripcionActiva 
};
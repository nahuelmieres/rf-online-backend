const express = require('express');
const router = express.Router();
const { verificarToken, verificarSuscripcionActiva } = require('../middlewares/authMiddleware'); // CAMBIO AQUÍ
const {
  registrarUsuario,
  loginUsuario,
  asignarPlanificacion,
  obtenerPerfil,
  obtenerUsuarios,
  cambiarRolUsuario,
  obtenerPlanRequestsUsuario,
  logoutUsuario
} = require('../controllers/usuariosController');

// Rutas públicas
router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);

// Rutas protegidas (requieren autenticación)
router.post('/logout', verificarToken, logoutUsuario);
router.get('/perfil', verificarToken, obtenerPerfil);
router.get('/clientes', verificarToken, obtenerUsuarios);
router.put('/:id/rol', verificarToken, cambiarRolUsuario);
router.put('/asignar/:idUsuario/:idPlan', verificarToken, asignarPlanificacion);
router.get('/:id/plan-request', verificarToken, obtenerPlanRequestsUsuario);

module.exports = router;
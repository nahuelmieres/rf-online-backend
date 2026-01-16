const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, asignarPlanificacion, 
    obtenerPerfil, obtenerUsuarios, cambiarRolUsuario,
obtenerPlanRequestsUsuario } = require('../controllers/usuariosController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');

router.post('/registrar', registrarUsuario);

router.post('/login', loginUsuario);

router.get('/perfil', verificarToken, obtenerPerfil);

router.put('/asignar-plan/:idUsuario/planificacion/:idPlan', verificarToken, verificarRol('admin', 'coach'), asignarPlanificacion);

router.get('/clientes', verificarToken, obtenerUsuarios);

router.put('/:id/cambiar-rol', verificarToken, verificarRol('admin'), cambiarRolUsuario);

// Obtener plan requests de usuarios (coach y admin)
router.get('/plan-requests/:id', verificarToken, verificarRol('admin', 'coach'), obtenerPlanRequestsUsuario);

module.exports = router;
const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, asignarPlanificacion, 
    obtenerPerfil, obtenerUsuarios, cambiarRolUsuario } = require('../controllers/usuariosController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');

router.post('/registrar', registrarUsuario);

router.post('/login', loginUsuario);

router.get('/perfil', verificarToken, obtenerPerfil);

router.put('/asignar-plan/:idUsuario/planificacion/:idPlan', verificarToken, verificarRol('admin', 'coach'), asignarPlanificacion);

router.get('/clientes', verificarToken, obtenerUsuarios);

router.put('/:id/cambiar-rol', verificarToken, verificarRol('admin'), cambiarRolUsuario);

module.exports = router;
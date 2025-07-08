const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, asignarPlanificacion, 
    obtenerPerfil, obtenerUsuarios } = require('../controllers/usuariosController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');

router.post('/registrar', registrarUsuario);

router.post('/login', loginUsuario);

router.get('/perfil', verificarToken, obtenerPerfil);

router.put('/asignar-plan/:idPlan', verificarToken, verificarRol('admin', 'coach'), asignarPlanificacion);

router.get('/clientes', verificarToken, obtenerUsuarios);

module.exports = router;
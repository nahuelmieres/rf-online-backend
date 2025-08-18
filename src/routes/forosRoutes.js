const express = require('express');
const router = express.Router();
const { obtenerForoPorPlanificacionId, crearMensajeForo,
    editarMensajeForo, eliminarMensajeForo } = require('../controllers/forosController');
const verificarToken = require('../middlewares/authMiddleware');

router.get('/:idPlanificacion', verificarToken, obtenerForoPorPlanificacionId);
router.post('/:idPlanificacion/mensajes', verificarToken, crearMensajeForo);
router.put('/mensajes/:mensajeId', verificarToken, editarMensajeForo);
router.delete('/mensajes/:mensajeId', verificarToken, eliminarMensajeForo);

module.exports = router;
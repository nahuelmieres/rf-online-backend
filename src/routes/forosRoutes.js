const express = require('express');
const router = express.Router();
const { obtenerForoPorPlanificacionId, crearMensajeForo,
    editarMensajeForo, eliminarMensajeForo } = require('../controllers/forosController');
const {verificarToken, verificarSuscripcionActiva} = require('../middlewares/authMiddleware');

router.get('/:idPlanificacion', verificarToken, verificarSuscripcionActiva, obtenerForoPorPlanificacionId);
router.post('/:idPlanificacion/mensajes', verificarToken, verificarSuscripcionActiva, crearMensajeForo);
router.put('/mensajes/:mensajeId', verificarToken, verificarSuscripcionActiva, editarMensajeForo);
router.delete('/mensajes/:mensajeId', verificarToken, verificarSuscripcionActiva, eliminarMensajeForo);

module.exports = router;
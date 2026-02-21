const express = require('express');
const router = express.Router();
const { obtenerDisponibilidad, crearReserva,
    obtenerMisReservas, eliminarReserva,
    obtenerTodasReservas
} = require('../controllers/reservasController');
const {verificarToken, verificarSuscripcionActiva} = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');

router.get('/disponibilidad/', verificarToken, verificarSuscripcionActiva, obtenerDisponibilidad);
router.post('/', verificarToken, verificarSuscripcionActiva, crearReserva);
router.get('/mis-reservas', verificarToken, verificarSuscripcionActiva, obtenerMisReservas);
router.delete('/:id', verificarToken, verificarSuscripcionActiva, eliminarReserva);
router.get('/', verificarToken, verificarRol('coach', 'admin'), obtenerTodasReservas);

module.exports = router;
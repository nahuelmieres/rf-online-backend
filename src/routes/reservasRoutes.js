const express = require('express');
const router = express.Router();
const { obtenerDisponibilidad, crearReserva,
    obtenerMisReservas, eliminarReserva,
    obtenerTodasReservas
} = require('../controllers/reservasController');
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');

router.get('/disponibilidad/', verificarToken, obtenerDisponibilidad);
router.post('/', verificarToken, crearReserva);
router.get('/mis-reservas', verificarToken, obtenerMisReservas);
router.delete('/:id', verificarToken, eliminarReserva);
router.get('/', verificarToken, verificarRol('coach', 'admin'), obtenerTodasReservas);

module.exports = router;
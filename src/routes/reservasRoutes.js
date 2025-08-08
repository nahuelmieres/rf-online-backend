const express = require('express');
const router = express.Router();
const { obtenerDisponibilidad, crearReserva,
  obtenerMisReservas, eliminarReserva
} = require('../controllers/reservasController');
const verificarToken = require('../middlewares/authMiddleware');

router.get('/disponibilidad/', verificarToken, obtenerDisponibilidad);
router.post('/', verificarToken, crearReserva);
router.get('/mis-reservas', verificarToken, obtenerMisReservas);
router.delete('/:id', verificarToken, eliminarReserva);

module.exports = router;
const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearPlanificacion, obtenerPlanificaciones, obtenerPlanificacionPorId } = require('../controllers/planificacionesController');
const { agregarBloqueASemana } = require('../controllers/bloquesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearPlanificacion);

router.get('/solo-admin', verificarToken, verificarRol('admin'), (req, res) => {
  res.json({ mensaje: 'Acceso solo para administradores' });
});

router.post('/coach-o-admin', verificarToken, verificarRol('coach', 'admin'), (req, res) => {
  res.json({ mensaje: 'Acceso válido para coach o admin' });
});

router.get('/', verificarToken, obtenerPlanificaciones);

router.post('/:idPlanificacion/semanas/:numeroSemana/bloques', verificarToken, verificarRol('coach', 'admin'), agregarBloqueASemana);

router.get('/:id', verificarToken, obtenerPlanificacionPorId);

module.exports = router;
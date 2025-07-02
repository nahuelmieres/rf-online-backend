const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearPlanificacion, obtenerPlanificaciones, obtenerPlanificacionPorId,
    eliminarBloqueDeSemana, eliminarPlanificacion, editarPlanificacion,
    obtenerBloquesDeSemana
 } = require('../controllers/planificacionesController');
const { agregarBloqueADia } = require('../controllers/bloquesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearPlanificacion);

router.get('/solo-admin', verificarToken, verificarRol('admin'), (req, res) => {
  res.json({ mensaje: 'Acceso solo para administradores' });
});

router.post('/coach-o-admin', verificarToken, verificarRol('coach', 'admin'), (req, res) => {
  res.json({ mensaje: 'Acceso válido para coach o admin' });
});

router.get('/', verificarToken, obtenerPlanificaciones);

router.post('/:idPlanificacion/semanas/:numeroSemana/dias', verificarToken, verificarRol('coach', 'admin'), 
agregarBloqueADia);

router.get('/:id', verificarToken, obtenerPlanificacionPorId);

router.delete('/:idPlanificacion/semanas/:numeroSemana/bloques/:idBloque', verificarToken, verificarRol('coach', 'admin'), eliminarBloqueDeSemana);

router.delete('/:id', verificarToken, verificarRol('admin'), eliminarPlanificacion);

router.put('/:id', verificarToken, verificarRol('coach', 'admin'), editarPlanificacion);

router.get('/:id/semanas/:numeroSemana/bloques', verificarToken, obtenerBloquesDeSemana);

module.exports = router;
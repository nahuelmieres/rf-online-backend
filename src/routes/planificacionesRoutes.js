const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearPlanificacion } = require('../controllers/planificacionesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearPlanificacion);

router.get('/solo-admin', verificarToken, verificarRol('admin'), (req, res) => {
  res.json({ mensaje: 'Acceso solo para administradores' });
});

router.post('/coach-o-admin', verificarToken, verificarRol('coach', 'admin'), (req, res) => {
  res.json({ mensaje: 'Acceso válido para coach o admin' });
});

module.exports = router;
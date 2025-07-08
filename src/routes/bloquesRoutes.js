const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearBloque, obtenerBloques } = require('../controllers/bloquesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearBloque);

router.get('/', verificarToken, verificarRol('coach', 'admin'), obtenerBloques);

module.exports = router;
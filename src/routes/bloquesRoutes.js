const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearBloque } = require('../controllers/bloquesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearBloque);

module.exports = router;
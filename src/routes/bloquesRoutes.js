const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const verificarRol = require('../middlewares/rolMiddleware');
const { crearBloque, obtenerBloques, 
    eliminarBloque, actualizarBloque } = require('../controllers/bloquesController');

router.post('/', verificarToken, verificarRol('coach', 'admin'), crearBloque);
router.get('/', verificarToken, verificarRol('coach', 'admin'), obtenerBloques);
router.delete('/:id', verificarToken, verificarRol('coach', 'admin'), eliminarBloque);
router.put('/:id', verificarToken, verificarRol('coach', 'admin'), actualizarBloque);

module.exports = router;
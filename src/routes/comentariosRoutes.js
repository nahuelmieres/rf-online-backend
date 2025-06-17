const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { crearComentario, obtenerComentarios, eliminarComentario } = require('../controllers/comentariosController');

router.post('/', verificarToken, crearComentario);

router.get('/', verificarToken, obtenerComentarios);

router.delete('/:id', verificarToken, eliminarComentario);

module.exports = router;

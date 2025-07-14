const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
    crearComentario,
    responderComentario,
    obtenerComentariosPorPlan,
    eliminarComentario,
    editarComentario
} = require('../controllers/comentariosController');
const verificarRol = require('../middlewares/rolMiddleware');

// Creo comentario
router.post('/', verificarToken, crearComentario);

// Obtengo comentarios por planificación/semana/día
router.get('/', verificarToken, obtenerComentariosPorPlan);

// Respondo comentario
router.put('/:id/responder', verificarToken, verificarRol('admin', 'coach'), responderComentario);

// Elimino comentario
router.delete('/:id', verificarToken, eliminarComentario);

// Edito comentario
router.put('/:id', verificarToken, editarComentario);

module.exports = router;

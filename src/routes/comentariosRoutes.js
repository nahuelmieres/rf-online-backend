const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
    crearComentario,
    responderComentario,
    obtenerComentariosPorPlan,
    eliminarComentario,
    editarComentario,
    editarRespuesta,
    eliminarRespuesta,
    obtenerRespuestasPorPlan
} = require('../controllers/comentariosController');
const verificarRol = require('../middlewares/rolMiddleware');

// Creo comentario
router.post('/', verificarToken, crearComentario);

// Obtengo comentarios por planificación/semana/día
router.get('/', verificarToken, obtenerComentariosPorPlan);

// Elimino comentario
router.delete('/:id', verificarToken, eliminarComentario);

// Edito comentario
router.put('/:id', verificarToken, editarComentario);

// Respondo comentario
router.post('/:id/responder', verificarToken, verificarRol('admin', 'coach'), responderComentario);

// Edito respuesta de comentario
router.put('/:id/respuesta', verificarToken, editarRespuesta);

// Elimino respuesta de comentario
router.delete('/:id/respuesta', verificarToken, eliminarRespuesta);

// Obtengo respuestas por planificación y usuario
router.get('/respuestas', verificarToken, verificarRol('admin', 'coach'), obtenerRespuestasPorPlan);

module.exports = router;

const mongoose = require('mongoose');
const MensajeForo = require('../models/MensajeForo');
const Planificacion = require('../models/Planificacion');

// Obtener el foro de una planificación por ID
const obtenerForoPorPlanificacionId = async (req, res) => {
    const { idPlanificacion: planificacionId } = req.params;

    console.log('Modelos disponibles:', mongoose.modelNames());
    try {
        // Valido primero que el ID de la planificación sea válido
        if (!mongoose.Types.ObjectId.isValid(planificacionId)) {
            return res.status(400).json({ mensaje: 'ID de planificación inválido.' });
        }
        //Valido que la planificación exista
        const planificacion = await Planificacion.findById(planificacionId);
        if (!planificacion) {
            return res.status(404).json({ mensaje: 'Planificación no encontrada.' });
        }
        // Busco los mensajes del foro asociados a la planificación
        // y los populamos con la información del autor
        const mensajes = await MensajeForo.find({ planificacionId })
            .populate('autor', 'nombre email rol')
            .sort({ fecha: 1 });

        res.json(mensajes);
    } catch (error) {
        console.error('Error al obtener el foro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
    }
}

// Creo un nuevo mensaje en el foro
const crearMensajeForo = async (req, res) => {
    const { idPlanificacion: planificacionId } = req.params;
    const { contenido } = req.body;

    try {
        // Valido que el ID de la planificación sea válido
        if (!mongoose.Types.ObjectId.isValid(planificacionId)) {
            return res.status(400).json({ mensaje: 'ID de planificación inválido.' });
        }
        // Valido que el contenido del mensaje no esté vacío
        if (!contenido || contenido.trim() === '') {
            return res.status(400).json({ mensaje: 'El contenido del mensaje es requerido.' });
        }

        // Verifico que la planificación exista
        const planificacion = await Planificacion.findById(planificacionId);
        if (!planificacion) {
            return res.status(404).json({ mensaje: 'Planificación no encontrada.' });
        }

        // Creo el nuevo mensaje en el foro
        const nuevoMensaje = new MensajeForo({
            planificacionId,
            autor: req.usuario.id, // Asumo que el usuario está autenticado y su ID está en req.usuario
            contenido
        });

        await nuevoMensaje.save();

        const mensajePoblado = await MensajeForo.findById(nuevoMensaje._id)
            .populate('autor', 'nombre email rol');

        res.status(201).json(mensajePoblado);
    } catch (error) {
        console.error('Error al crear el mensaje en el foro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
    }
}

// Edito los mensajes del foro
const editarMensajeForo = async (req, res) => {
    const { mensajeId } = req.params;
    const { contenido } = req.body;

    try {
        // Valido que el ID del mensaje sea válido
        if (!mongoose.Types.ObjectId.isValid(mensajeId)) {
            return res.status(400).json({ mensaje: 'ID de mensaje inválido.' });
        }

        // Busco el mensaje por ID
        const mensaje = await MensajeForo.findById(mensajeId);
        if (!mensaje) {
            return res.status(404).json({ mensaje: 'Mensaje no encontrado.' });
        }

        // Verifico que el usuario sea el autor del mensaje
        if (mensaje.autor.toString() !== req.usuario.id.toString()) {
            return res.status(403).json({ mensaje: 'No tienes permiso para editar este mensaje.' });
        }

        // Actualizo el contenido del mensaje
        mensaje.contenido = contenido;
        await mensaje.save();

        res.json(mensaje);
    } catch (error) {
        console.error('Error al editar el mensaje en el foro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
    }
}

// Elimino los mensajes del foro
const eliminarMensajeForo = async (req, res) => {
    const { mensajeId } = req.params;

    try {
        // Valido que el ID del mensaje sea válido
        if (!mongoose.Types.ObjectId.isValid(mensajeId)) {
            return res.status(400).json({ mensaje: 'ID de mensaje inválido.' });
        }

        // Busco el mensaje por ID
        const mensaje = await MensajeForo.findById(mensajeId);
        if (!mensaje) {
            return res.status(404).json({ mensaje: 'Mensaje no encontrado.' });
        }

        // Verifico que el usuario sea el autor del mensaje
        if (mensaje.autor.toString() !== req.usuario.id.toString()) {
            return res.status(403).json({ mensaje: 'No tienes permiso para eliminar este mensaje.' });
        }

        // Elimino el mensaje
        await MensajeForo.findByIdAndDelete(mensajeId);

        res.json({ mensaje: 'Mensaje eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el mensaje en el foro:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
    }
}

module.exports = {
    obtenerForoPorPlanificacionId,
    crearMensajeForo,
    editarMensajeForo,
    eliminarMensajeForo
};
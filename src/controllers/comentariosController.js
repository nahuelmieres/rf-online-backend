const Comentario = require('../models/Comentario');

const crearComentario = async (req, res) => {
  try {
    const { texto, planificacion, semana, bloque } = req.body;

    if (!texto || texto.trim() === '') {
      return res.status(400).json({ mensaje: 'El comentario no puede estar vacío' });
    }

    if (!planificacion && !bloque) {
      return res.status(400).json({ mensaje: 'Debe estar asociado a una planificación o bloque' });
    }

    const nuevoComentario = new Comentario({
      autor: req.usuario.id,
      texto,
      planificacion,
      semana,
      bloque
    });

    await nuevoComentario.save();

    res.status(201).json(nuevoComentario);
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const obtenerComentarios = async (req, res) => {
  try {
    const { planificacion, semana, bloque } = req.query;

    const filtro = {};
    if (planificacion) filtro.planificacion = planificacion;
    if (semana) filtro.semana = parseInt(semana);
    if (bloque) filtro.bloque = bloque;

    const comentarios = await Comentario.find(filtro)
      .populate('autor', 'nombre email rol') // opcional, para ver quién lo escribió
      .sort({ creadoEn: -1 });

    res.status(200).json(comentarios);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const eliminarComentario = async (req, res) => {
  try {
    const comentario = await Comentario.findById(req.params.id);

    if (!comentario) {
      return res.status(404).json({ mensaje: 'Comentario no encontrado' });
    }

    const esAutor = comentario.autor.toString() === req.usuario.id;
    const esModerador = ['coach', 'admin'].includes(req.usuario.rol);

    if (!esAutor && !esModerador) {
      return res.status(403).json({ mensaje: 'No tenés permiso para eliminar este comentario' });
    }

    await comentario.deleteOne();

    res.status(200).json({ mensaje: 'Comentario eliminado satisfactoriamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = { crearComentario, 
    obtenerComentarios,
    eliminarComentario };
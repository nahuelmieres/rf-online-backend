const mongoose = require('mongoose');
const Comentario = require('../models/Comentario');

const crearComentario = async (req, res) => {
  try {
    const { texto, planificacion, semana, dia } = req.body;

    // Validación de campos
    if (!texto || !planificacion || !semana || !dia) {
      return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
    }

    // Valido que el día sea correcto
    const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    if (!diasValidos.includes(dia)) {
      return res.status(400).json({ mensaje: 'Día no válido' });
    }

    // Verifico que la planificación existe
    const planExistente = await mongoose.model('Planificacion').findById(planificacion);
    if (!planExistente) {
      return res.status(404).json({ mensaje: 'Planificación no encontrada' });
    }

    // Verifico que la semana existe en la planificación
    const semanaExistente = planExistente.semanas.find(s => s.numero === parseInt(semana));
    if (!semanaExistente) {
      return res.status(404).json({ mensaje: 'Semana no encontrada en la planificación' });
    }

    // Verifico que el día existe en la semana
    const diaExistente = semanaExistente.dias.find(d => d.nombre === dia);
    if (!diaExistente) {
      return res.status(404).json({ mensaje: 'Día no encontrado en la semana' });
    }

    const nuevoComentario = new Comentario({
      autor: req.usuario.id,
      texto,
      planificacion,
      semana: parseInt(semana),
      dia
    });

    await nuevoComentario.save();

    const comentarioPoblado = await Comentario.findById(nuevoComentario._id)
      .populate('autor', 'nombre email rol')
      .populate('planificacion', 'titulo');

    res.status(201).json({
      mensaje: 'Comentario creado exitosamente',
      data: comentarioPoblado
    });
  } catch (err) {
    console.error('Error al crear comentario:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const responderComentario = async (req, res) => {
  try {
    const comentario = await Comentario.findById(req.params.id);
    if (!comentario) return res.status(404).json({ mensaje: 'Comentario no encontrado' });

    const usuario = req.usuario;
    if (!['coach', 'admin'].includes(usuario.rol)) {
      return res.status(403).json({ mensaje: 'No autorizado para responder' });
    }

    comentario.respuesta = {
      texto: req.body.texto,
      autor: usuario.id,
      fecha: new Date()
    };

    await comentario.save();
    res.json({ mensaje: "Respuesta exitosa", data: comentario });

  } catch (err) {
    console.error('Error al responder comentario:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const obtenerComentariosPorPlan = async (req, res) => {
  try {
    const { planificacion, idUsuario } = req.query;
    const filtro = {};

    if (!planificacion) {
      return res.status(400).json({ mensaje: 'Falta ID de Planificación para obtener comentarios' });
    }

    filtro.planificacion = planificacion;
    filtro.autor = idUsuario.toString();

    const comentarios = await Comentario.find(filtro)
      .populate('autor', 'nombre email rol')
      .sort({ creadoEn: -1 });

    res.status(200).json({ data: comentarios });
  } catch (err) {
    console.error('Error al obtener comentarios:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const eliminarComentario = async (req, res) => {
  try {
    const comentario = await Comentario.findById(req.params.id);
    if (!comentario) {
      return res.status(404).json({ mensaje: 'Comentario no encontrado' });
    }

    const esPropio = comentario.autor.toString() === req.usuario.id;
    const esEntrenador = ['admin', 'coach'].includes(req.usuario.rol);

    if (!esPropio && !esEntrenador) {
      return res.status(403).json({ mensaje: 'No autorizado para eliminar este comentario' });
    }

    await comentario.deleteOne();
    res.json({ mensaje: 'Comentario eliminado' });
  } catch (err) {
    console.error('Error al eliminar comentario:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};


// Editar comentario
const editarComentario = async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || texto.trim() === '') {
      return res.status(400).json({ mensaje: 'El texto no puede estar vacío' });
    }

    const comentario = await Comentario.findById(req.params.id);
    if (!comentario) {
      return res.status(404).json({ mensaje: 'Comentario no encontrado' });
    }

    const esPropio = comentario.autor.toString() === req.usuario.id;

    if (!esPropio) {
      return res.status(403).json({ mensaje: 'No autorizado para editar este comentario' });
    }

    comentario.texto = texto;
    await comentario.save();

    res.json({ mensaje: "Comentario editado exitosamente", data: comentario });
  } catch (err) {
    console.error('Error al editar comentario:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = {
  crearComentario,
  responderComentario,
  obtenerComentariosPorPlan,
  eliminarComentario,
  editarComentario
};

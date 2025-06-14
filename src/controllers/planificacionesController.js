const Planificacion = require('../models/Planificacion');

const crearPlanificacion = async (req, res) => {
  try {
    let { titulo, descripcion, tipo } = req.body;

    if (!titulo || !tipo) {
      return res.status(400).json({ mensaje: 'Título y tipo son obligatorios' });
    }

    tipo = tipo.toLowerCase();

    const nuevaPlanificacion = new Planificacion({
      titulo,
      descripcion,
      tipo,
      creadoPor: req.usuario.id
    });

    const planificacionGuardada = await nuevaPlanificacion.save();
    res.status(201).json(planificacionGuardada);
  } catch (error) {
    console.error('Error al crear planificacion:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const obtenerPlanificaciones = async (req, res) => {
  try {
    const filtros = {};

    // Si se pasan filtros, los agregamos al objeto de búsqueda
    if (req.query.tipo) {
      filtros.tipo = req.query.tipo;
    }

    if (req.query.creadoPor) {
      filtros.creadoPor = req.query.creadoPor;
    }

    const planificaciones = await Planificacion.find(filtros)
    .populate('creadoPor', 'nombre email')
    .sort({ fechaCreacion: -1 });

    res.status(200).json(planificaciones);
  } catch (error) {
    console.error('Error al obtener planificaciones:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

const obtenerPlanificacionPorId = async (req, res) => {
  try {
    const planificacion = await Planificacion.findById(req.params.id)
      .populate('semanas.bloques') // trae los bloques de cada semana
      .populate('creadoPor', 'nombre email rol'); // opcional: info del creador

    if (!planificacion) {
      return res.status(404).json({ mensaje: 'Planificación no encontrada' });
    }

    res.status(200).json(planificacion);
  } catch (error) {
    console.error('Error al obtener planificación:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};


module.exports = { crearPlanificacion, 
    obtenerPlanificaciones,
    obtenerPlanificacionPorId
 };
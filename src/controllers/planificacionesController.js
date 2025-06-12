const Planificacion = require('../models/Planificacion');

const crearPlanificacion = async (req, res) => {
  try {
    const { titulo, descripcion, tipo } = req.body;

    if (!titulo || !tipo) {
      return res.status(400).json({ mensaje: 'Título y tipo son obligatorios' });
    }

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

module.exports = { crearPlanificacion };
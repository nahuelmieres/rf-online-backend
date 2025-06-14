const Bloque = require('../models/Bloque');
const Planificacion = require('../models/Planificacion');

const crearBloque = async (req, res) => {
  try {
    const { tipo, contenidoTexto, ejercicios } = req.body;
    
    if (!tipo || (tipo !== 'texto' && tipo !== 'ejercicios' || tipo.trim() === '')) {
      return res.status(400).json({ mensaje: 'Tipo de bloque es obligatorio y debe ser "texto" o "ejercicios"' });
    }

    const nuevoBloque = new Bloque({
      tipo,
      contenidoTexto,
      ejercicios,
      creadoPor: req.usuario.id
    });

    const bloqueGuardado = await nuevoBloque.save();
    res.status(201).json(bloqueGuardado);
  } catch (error) {
    console.error('Error al crear bloque:', error);
    res.status(500).json({ mensaje: 'Error al crear bloque' });
  }
};

const agregarBloqueASemana = async (req, res) => {
  const { idPlanificacion, numeroSemana } = req.params;
  const { idBloque } = req.body;

  try {
    const plan = await Planificacion.findById(idPlanificacion);
    if (!plan) return res.status(404).json({ mensaje: 'Planificación no encontrada' });

    // Buscar o crear la semana
    let semana = plan.semanas.find(s => s.numero === parseInt(numeroSemana));
    if (!semana) {
      semana = { numero: parseInt(numeroSemana), bloques: [] };
      plan.semanas.push(semana);
    }

    // Agregar el bloque
    semana.bloques.push(idBloque);

    await plan.save();
    res.status(200).json({ mensaje: 'Bloque agregado a la semana', planificacion: plan });
  } catch (error) {
    console.error('Error al agregar bloque:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};


module.exports = { crearBloque,
    agregarBloqueASemana
 };

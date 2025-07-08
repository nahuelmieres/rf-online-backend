const mongoose = require('mongoose');
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

const agregarBloqueADia = async (req, res) => {
  const { idPlanificacion, numeroSemana } = req.params;
  const { idBloque, dia } = req.body;

  // Validación más estricta de parámetros
  if (!mongoose.Types.ObjectId.isValid(idPlanificacion) ||
    !mongoose.Types.ObjectId.isValid(idBloque)) {
    return res.status(400).json({
      success: false,
      message: 'ID de planificación o bloque inválido'
    });
  }

  if (isNaN(numeroSemana) || numeroSemana < 1) {
    return res.status(400).json({
      success: false,
      message: 'Número de semana inválido'
    });
  }

  const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  if (!diasValidos.includes(dia)) {
    return res.status(400).json({
      success: false,
      message: 'Día inválido. Valores permitidos: ' + diasValidos.join(', ')
    });
  }

  try {
    // Verificación en paralelo más eficiente
    const [planExistente, bloqueExistente] = await Promise.all([
      Planificacion.findById(idPlanificacion),
      Bloque.findById(idBloque).select('_id tipo')
    ]);

    if (!planExistente) {
      return res.status(404).json({
        success: false,
        message: 'Planificación no encontrada'
      });
    }

    if (!bloqueExistente) {
      return res.status(404).json({
        success: false,
        message: 'Bloque no encontrado'
      });
    }

    // Buscar o crear semana (usando Mongoose subdocuments)
    let semana = planExistente.semanas.find(s => s.numero === parseInt(numeroSemana));
    if (!semana) {
      semana = { numero: parseInt(numeroSemana), dias: [] };
      planExistente.semanas.push(semana);
    }

    // Buscar o crear día
    let diaObj = semana.dias.find(d => d.nombre === dia);
    if (!diaObj) {
      diaObj = {
        nombre: dia,
        bloques: [],
        descanso: false // Asegurar valor por defecto
      };
      semana.dias.push(diaObj);
    }

    // Verificar duplicados usando toString()
    const bloqueDuplicado = diaObj.bloques.some(b => b.toString() === idBloque);
    if (bloqueDuplicado) {
      return res.status(409).json({ // 409 Conflict es más semántico
        success: false,
        message: 'El bloque ya está asignado a este día'
      });
    }

    // Asignar bloque
    diaObj.bloques.push(bloqueExistente._id);
    diaObj.descanso = false; // Si era día de descanso, lo cambiamos

    // Guardar con validación
    await planExistente.save();

    // Respuesta detallada
    res.json({
      success: true,
      message: `Bloque ${bloqueExistente.tipo} asignado al ${dia}`,
      data: {
        planificacion: idPlanificacion,
        semana: semana.numero,
        dia,
        bloquesCount: diaObj.bloques.length,
        bloque: {
          id: bloqueExistente._id,
          tipo: bloqueExistente.tipo
        }
      }
    });

  } catch (error) {
    console.error('Error en agregarBloqueADia:', error);

    // Manejo específico para errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/*
 * @desc    Obtener todos los bloques con filtros opcionales
 * @route   GET /api/bloques
 * @access  Privado (Autenticado)
 * @query   {String} [creadoPor] - Filtrar por ID de creador
 * @query   {String} [tipo] - Filtrar por tipo ('texto' o 'ejercicios')
 * @query   {Boolean} [populateCreador=false] - Poblar datos del creador
 */
/*
  Ejemplos de uso:
  GET /api/bloques -> Todos los bloques
  GET /api/bloques?creadoPor=662a4c8d9c8f6a3d504b3a21 -> Por usuario
  GET /api/bloques?tipo=ejercicios -> Solo bloques de ejercicios
  GET /api/bloques?populateCreador=true -> Incluye info del creador
*/
const obtenerBloques = async (req, res) => {
  try {
    const { creadoPor, tipo, populateCreador } = req.query;

    // 1. Construyo filtros
    const filtro = {};

    if (creadoPor) {
      if (!ObjectId.isValid(creadoPor)) {
        return res.status(400).json({
          success: false,
          mensaje: 'ID de creador inválido'
        });
      }
      filtro.creadoPor = creadoPor;
    }

    if (tipo) {
      if (!['texto', 'ejercicios'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          mensaje: 'Tipo debe ser "texto" o "ejercicios"'
        });
      }
      filtro.tipo = tipo;
    }

    // 2. Configuro populate condicional
    const populateOptions = populateCreador === 'true' ? {
      path: 'creadoPor',
      select: '_id nombre email rol',
      match: { deleted: { $ne: true } } // Opcional: excluyo usuarios eliminados
    } : null;

    // 3. Ejecuto consulta
    let query = Bloque.find(filtro)
      .sort('-fechaCreacion')
      .lean();

    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const bloques = await query;

    // 4. Filtro bloques con creadores eliminados (si se pobló)
    const resultado = populateOptions
      ? bloques.filter(bloque => bloque.creadoPor !== null)
      : bloques;

    res.json({
      success: true,
      count: resultado.length,
      data: resultado
    });

  } catch (error) {
    console.error('Error en obtenerBloques:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener bloques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
module.exports = {
  crearBloque,
  agregarBloqueADia,
  obtenerBloques
};

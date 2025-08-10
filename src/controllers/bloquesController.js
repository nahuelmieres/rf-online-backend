const mongoose = require('mongoose');
const Bloque = require('../models/Bloque');
const Planificacion = require('../models/Planificacion');

const crearBloque = async (req, res) => {
  try {
    let { titulo, tipo, contenidoTexto, ejercicios, etiquetas } = req.body;

    // Sanitizados básicos
    titulo = (titulo ?? '').trim();
    tipo = (tipo ?? '').trim(); // 'texto' | 'ejercicios'

    if (!titulo) {
      return res.status(400).json({ mensaje: 'El título del bloque es obligatorio' });
    }

    if (!['texto', 'ejercicios'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de bloque inválido' });
    }

    // Normalizar etiquetas
    if (Array.isArray(etiquetas)) {
      etiquetas = [...new Set(
        etiquetas
          .map(e => (e ?? '').toString().trim().toLowerCase())
          .filter(e => e.length > 0 && e.length <= 30)
      )];
    } else {
      etiquetas = [];
    }

    // Si es bloque de texto, me aseguro contenido y vaciamos ejercicios
    if (tipo === 'texto') {
      contenidoTexto = (contenidoTexto ?? '').toString().trim();
      if (!contenidoTexto) {
        return res.status(400).json({ mensaje: 'El contenido es requerido para bloques de texto' });
      }
      ejercicios = []; // evita guardar basura accidental
    }

    // Si es bloque de ejercicios, valido y normalizamos ejercicios
    if (tipo === 'ejercicios') {
      if (!Array.isArray(ejercicios) || ejercicios.length === 0) {
        return res.status(400).json({ mensaje: 'Debe incluir al menos un ejercicio' });
      }

      ejercicios = ejercicios.map((e, idx) => {
        const nombre = (e?.nombre ?? '').toString().trim();
        const repeticiones = (e?.repeticiones ?? '').toString().trim();
        const series = Number(e?.series);
        const escala = (e?.escala ?? '').toString().trim().toUpperCase(); // RPE | RIR
        const esfuerzoPercibido = e?.esfuerzoPercibido != null ? Number(e.esfuerzoPercibido) : undefined;
        const linkVideo = (e?.linkVideo ?? '').toString().trim();

        // Validaciones rápidas antes de pasar a Mongoose
        if (!nombre) throw new Error(`Ejercicio #${idx + 1}: el nombre es requerido`);
        if (!repeticiones) throw new Error(`Ejercicio #${idx + 1}: repeticiones es requerido`);
        if (!Number.isInteger(series) || series < 1) {
          throw new Error(`Ejercicio #${idx + 1}: series debe ser un entero ≥ 1`);
        }
        if (escala && !['RPE', 'RIR'].includes(escala)) {
          throw new Error(`Ejercicio #${idx + 1}: escala inválida (usa RPE o RIR)`);
        }
        if (esfuerzoPercibido != null) {
          if (Number.isNaN(esfuerzoPercibido) || esfuerzoPercibido < 1 || esfuerzoPercibido > 10) {
            throw new Error(`Ejercicio #${idx + 1}: esfuerzoPercibido debe estar entre 1 y 10`);
          }
        }

        return {
          nombre,
          repeticiones,
          series,
          escala: escala || undefined,
          esfuerzoPercibido: esfuerzoPercibido ?? undefined,
          linkVideo
        };
      });

      // En bloques de ejercicios, no guardo contenidoTexto
      contenidoTexto = undefined;
    }

    const nuevoBloque = new Bloque({
      titulo,
      tipo,
      contenidoTexto,
      ejercicios,
      etiquetas,
      creadoPor: req.usuario.id
    });

    const bloqueGuardado = await nuevoBloque.save();
    return res.status(201).json(bloqueGuardado);

  } catch (error) {
    // Si es un ValidationError de Mongoose => 400 con detalle
    if (error.name === 'ValidationError') {
      const detalles = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ mensaje: 'Validación fallida', errores: detalles });
    }
    // Errores lanzados por nuestras validaciones manuales
    if (error.message?.startsWith('Ejercicio #')) {
      return res.status(400).json({ mensaje: error.message });
    }

    console.error('Error al crear bloque:', error);
    return res.status(500).json({ mensaje: 'Error al crear bloque' });
  }
};

const agregarBloqueADia = async (req, res) => {
  const { idPlanificacion, numeroSemana } = req.params;
  const { idBloque, dia } = req.body;

  // Validación básica de IDs
  if (!mongoose.Types.ObjectId.isValid(idPlanificacion)) {
    return res.status(400).json({
      success: false,
      message: 'ID de planificación inválido'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(idBloque)) {
    return res.status(400).json({
      success: false,
      message: 'ID de bloque inválido'
    });
  }

  // Validación de día
  const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  if (!diasValidos.includes(dia)) {
    return res.status(400).json({
      success: false,
      message: 'Día inválido. Valores permitidos: ' + diasValidos.join(', ')
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verifico existencia del bloque
    const bloqueExistente = await Bloque.findById(idBloque).session(session);
    if (!bloqueExistente) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Bloque no encontrado'
      });
    }

    // 2. Obtengo planificación
    const planificacion = await Planificacion.findById(idPlanificacion).session(session);
    if (!planificacion) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Planificación no encontrada'
      });
    }

    // 3. Función para limpiar referencias inválidas
    const limpiarBloquesInvalidos = (dias) => {
      return dias.map(dia => ({
        ...dia.toObject ? dia.toObject() : dia,
        bloques: (dia.bloques || []).filter(b => mongoose.Types.ObjectId.isValid(b))
      }));
    };

    // 4. Configuración de días por semana
    const diasPorSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // 5. Busco o creo la semana
    let semana = planificacion.semanas.find(s => s.numero === parseInt(numeroSemana));
    const semanaNumero = parseInt(numeroSemana);

    if (!semana) {
      // Creo nueva semana con estructura completa
      semana = {
        numero: semanaNumero,
        dias: diasPorSemana.map(nombreDia => ({
          nombre: nombreDia,
          bloques: nombreDia === dia ? [new mongoose.Types.ObjectId(idBloque)] : [],
          descanso: nombreDia !== dia
        }))
      };
      planificacion.semanas.push(semana);
    } else {
      // Semana existente - limpio referencias
      semana.dias = limpiarBloquesInvalidos(semana.dias);

      // Completo días faltantes si existen
      diasPorSemana.forEach(nombreDia => {
        if (!semana.dias.some(d => d.nombre === nombreDia)) {
          semana.dias.push({
            nombre: nombreDia,
            bloques: [],
            descanso: nombreDia !== dia
          });
        }
      });

      // Ordeno días según configuración estándar
      semana.dias.sort((a, b) => diasPorSemana.indexOf(a.nombre) - diasPorSemana.indexOf(b.nombre));

      // Busco día específico
      const diaObj = semana.dias.find(d => d.nombre === dia);
      if (!diaObj) {
        throw new Error(`Error interno: Día ${dia} no encontrado después de validación`);
      }

      // Verifico duplicado
      if (diaObj.bloques.some(b => b.toString() === idBloque)) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'El bloque ya está asignado a este día'
        });
      }

      // Asigno bloque
      diaObj.bloques.push(new mongoose.Types.ObjectId(idBloque));
      diaObj.descanso = false;
    }

    // 6. Guardo cambios
    planificacion.markModified('semanas');
    await planificacion.save({ session });
    await session.commitTransaction();

    // 7. Preparo respuesta exitosa
    res.json({
      success: true,
      message: `Bloque "${bloqueExistente.titulo}" asignado al ${dia} (Semana ${semanaNumero})`,
      data: {
        planificacionId: idPlanificacion,
        semana: semanaNumero,
        dia,
        bloque: {
          id: idBloque,
          titulo: bloqueExistente.titulo,
          tipo: bloqueExistente.tipo
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error en agregarBloqueADia:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
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

// Eliminar un bloque
const eliminarBloque = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ mensaje: 'ID de bloque inválido' });
  }

  try {
    const bloque = await Bloque.findByIdAndDelete(id);
    if (!bloque) {
      return res.status(404).json({ mensaje: 'Bloque no encontrado' });
    }

    // Limpio referencias en planificaciones
    await Planificacion.updateMany(
      {},
      { $pull: { "semanas.$[].dias.$[].bloques": id } }
    );

    res.json({ mensaje: 'Bloque eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar bloque:', error);
    res.status(500).json({ mensaje: 'Error al eliminar bloque' });
  }
};

// Actualizar bloque
const actualizarBloque = async (req, res) => {
  const { id } = req.params;
  const { titulo, tipo, contenidoTexto, ejercicios, etiquetas } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ mensaje: 'ID de bloque inválido' });
  }

  // Validaciones básicas
  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    return res.status(400).json({ mensaje: 'El título es obligatorio y debe ser una cadena no vacía' });
  }
  if (tipo && !['texto', 'ejercicios'].includes(tipo)) {
    return res.status(400).json({ mensaje: 'Tipo de bloque inválido' });
  }
  if (tipo === 'texto' && (!contenidoTexto || typeof contenidoTexto !== 'string' || contenidoTexto.trim() === '')) {
    return res.status(400).json({ mensaje: 'El contenido es obligatorio para bloques de texto' });
  }
  if (tipo === 'ejercicios' && (!Array.isArray(ejercicios) || ejercicios.length === 0)) {
    return res.status(400).json({ mensaje: 'Debe incluir al menos un ejercicio para bloques de ejercicios' });
  }

  try {
    const bloque = await Bloque.findById(id);
    if (!bloque) {
      return res.status(404).json({ mensaje: 'Bloque no encontrado' });
    }

    // Actualizar campos
    bloque.titulo = titulo || bloque.titulo;
    bloque.tipo = tipo || bloque.tipo;
    bloque.contenidoTexto = contenidoTexto || bloque.contenidoTexto;
    bloque.ejercicios = ejercicios || bloque.ejercicios;
    bloque.etiquetas = etiquetas || bloque.etiquetas;

    const bloqueActualizado = await bloque.save();
    res.json({ mensaje: 'Bloque actualizado correctamente', bloque: bloqueActualizado });
  } catch (error) {
    console.error('Error al actualizar bloque:', error);
    res.status(500).json({ mensaje: 'Error al actualizar bloque' });
  }
};

module.exports = {
  crearBloque,
  agregarBloqueADia,
  obtenerBloques,
  eliminarBloque,
  actualizarBloque
};

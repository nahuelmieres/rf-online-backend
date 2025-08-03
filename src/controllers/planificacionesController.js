const mongoose = require('mongoose');
const Planificacion = require('../models/Planificacion');
const Bloque = require('../models/Bloque');

/*
 * Crea una nueva planificación con semanas y días inicializados
 * 
 * @param {Object} req - Request object
 * @param {string} req.body.titulo - Título de la planificación (obligatorio)
 * @param {string} req.body.descripcion - Descripción opcional
 * @param {string} req.body.tipo - Tipo de planificación (fuerza, hipertrofia, etc.)
 * @param {number} [req.body.cantidadSemanas=2] - Número de semanas a crear (opcional)
 * @param {Array} [req.body.diasPorSemana=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']] - Días a incluir
 */
const crearPlanificacion = async (req, res) => {
    try {
        let { titulo, descripcion, tipo, cantidadSemanas = 2, diasPorSemana, categoria } = req.body;

        // Validaciones básicas
        if (!titulo || !tipo) {
            return res.status(400).json({ 
                success: false,
                message: 'Título y tipo son obligatorios' 
            });
        }

        // Valido categoría
        const categoriasValidas = ['basica', 'personalizada'];
        if (categoria && !categoriasValidas.includes(categoria)) {
            return res.status(400).json({
                success: false,
                message: `Categoría inválida. Use una de: ${categoriasValidas.join(', ')}`
            });
        }

        // Valido tipo
        const tiposValidos = ['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'];
        tipo = tipo.toLowerCase();
        
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: `Tipo inválido. Use uno de: ${tiposValidos.join(', ')}`
            });
        }

        // Configuración de días por semana (valor por defecto: Lunes a Domingo)
        const diasDefault = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        diasPorSemana = diasPorSemana || diasDefault;
        
        // Valido días
        const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diasInvalidos = diasPorSemana.filter(d => !diasValidos.includes(d));
        
        if (diasInvalidos.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Días inválidos: ${diasInvalidos.join(', ')}. Use: ${diasValidos.join(', ')}`
            });
        }

        // Creo estructura de semanas
        const semanas = [];
        for (let i = 1; i <= cantidadSemanas; i++) {
            semanas.push({
                numero: i,
                dias: diasPorSemana.map(nombreDia => ({
                    nombre: nombreDia,
                    bloques: [],
                    descanso: false
                }))
            });
        }

        // Crear la planificación
        const nuevaPlanificacion = new Planificacion({
            titulo: titulo.trim(),
            descripcion: descripcion?.trim(),
            tipo,
            semanas,
            creadoPor: req.usuario.id,
            categoria: categoria
        });

        const planificacionGuardada = await nuevaPlanificacion.save();

        // Respuesta estructurada
        res.status(201).json({
            success: true,
            message: 'Planificación creada exitosamente',
            data: {
                id: planificacionGuardada._id,
                titulo: planificacionGuardada.titulo,
                tipo: planificacionGuardada.tipo,
                semanas: planificacionGuardada.semanas.length,
                diasPorSemana: diasPorSemana.length,
                fechaCreacion: planificacionGuardada.fechaCreacion,
                diasIncluidos: diasPorSemana, // Para que el frontend sepa qué días esperar
                categoria: planificacionGuardada.categoria
            }
        });

    } catch (error) {
        console.error('Error al crear planificación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al crear planificación',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerPlanificaciones = async (req, res) => {
    try {
        const filtros = {};

        if (req.query.tipo) filtros.tipo = req.query.tipo;
        if (req.query.categoria) filtros.categoria = req.query.categoria;
        if (req.query.creadoPor) filtros.creadoPor = req.query.creadoPor;

        // Obtener planificaciones base
        let planificaciones = await Planificacion.find(filtros)
            .populate('creadoPor', 'nombre email')
            .sort({ fechaCreacion: -1 })
            .lean();

        // Poblar bloques para cada planificación
        planificaciones = await Promise.all(planificaciones.map(async (plan) => {
            // Poblar bloques para cada día de cada semana
            const semanasConBloques = await Promise.all(plan.semanas.map(async (semana) => {
                const diasConBloques = await Promise.all(semana.dias.map(async (dia) => {
                    if (dia.bloques?.length > 0) {
                        const bloquesPoblados = await Bloque.find({ 
                            _id: { $in: dia.bloques } 
                        }).select('nombre tipo ejercicios').lean();
                        
                        return {
                            ...dia,
                            bloquesPoblados,
                            tieneBloques: bloquesPoblados.length > 0
                        };
                    }
                    return {
                        ...dia,
                        bloquesPoblados: [],
                        tieneBloques: false
                    };
                }));
                
                return {
                    ...semana,
                    dias: diasConBloques
                };
            }));
            
            return {
                ...plan,
                semanas: semanasConBloques,
                totalBloques: semanasConBloques.reduce(
                    (total, semana) => total + semana.dias.reduce(
                        (sum, dia) => sum + (dia.bloquesPoblados?.length || 0), 0), 0)
            };
        }));

        res.status(200).json(planificaciones);
    } catch (error) {
        console.error('Error al obtener planificaciones:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/*
 * Obtiene una planificación completa por ID con bloques poblados y manejo automático de días de descanso
 * 
 * @param {string} id - ID de la planificación
 * @returns {Object} Planificación con bloques poblados y días de descanso marcados
 */
const obtenerPlanificacionPorId = async (req, res) => {
    try {
        // Valido ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                success: false,
                message: 'ID de planificación inválido' 
            });
        }

        // Obtengo planificación base con creador poblado
        const planificacion = await Planificacion.findById(req.params.id)
            .populate('creadoPor', 'nombre email rol')
            .lean();

        if (!planificacion) {
            return res.status(404).json({ 
                success: false,
                message: 'Planificación no encontrada' 
            });
        }

        // Poblamos bloques y manejar días de descanso
        for (const semana of planificacion.semanas) {
            for (const dia of semana.dias) {
                // Poblamos bloques del día
                if (dia.bloques && dia.bloques.length > 0) {
                    dia.bloquesPoblados = await Bloque.find({ 
                        _id: { $in: dia.bloques } 
                    }).select('-__v -creadoPor -fechaCreacion').lean();
                }
                
                // Auto-marcar como descanso si no tiene bloques
                if (dia.bloques.length === 0 && dia.descanso === false) {
                    dia.descanso = true;
                }
            }
            
            // Elimino array original de bloques para evitar confusión
            delete semana.bloques;
        }

        // Respuesta estructurada
        res.status(200).json({
            success: true,
            data: {
                ...planificacion,
                totalSemanas: planificacion.semanas.length,
                totalDias: planificacion.semanas.reduce((acc, semana) => acc + semana.dias.length, 0),
                totalBloques: planificacion.semanas.reduce(
                    (acc, semana) => acc + semana.dias.reduce(
                        (sum, dia) => sum + (dia.bloquesPoblados?.length || 0), 0), 0),
                totalDescansos: planificacion.semanas.reduce(
                    (acc, semana) => acc + semana.dias.filter(d => d.descanso).length, 0)
            }
        });

    } catch (error) {
        console.error('Error al obtener planificación:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener planificación',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const eliminarBloqueDeSemana = async (req, res) => {
    const { idPlanificacion, numeroSemana, idBloque } = req.params;

    try {
        const plan = await Planificacion.findById(idPlanificacion);
        if (!plan) return res.status(404).json({ mensaje: 'Planificación no encontrada' });

        const semana = plan.semanas.find(s => s.numero === parseInt(numeroSemana));
        if (!semana) return res.status(404).json({ mensaje: 'Semana no encontrada' });

        semana.bloques = semana.bloques.filter(b => b.toString() !== idBloque);
        await plan.save();

        res.status(200).json({ mensaje: 'Bloque eliminado de la semana' });
    } catch (error) {
        console.error('Error al eliminar bloque:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

const eliminarPlanificacion = async (req, res) => {
    try {
        const plan = await Planificacion.findByIdAndDelete(req.params.id);

        if (!plan) {
            return res.status(404).json({ mensaje: 'Planificación no encontrada' });
        }

        res.status(200).json({ mensaje: 'Planificación eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar planificación:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

const editarPlanificacion = async (req, res) => {
    try {
        const { titulo, descripcion, tipo, semanas, categoria } = req.body;

        const noHayCamposParaActualizar =
            !titulo &&
            !descripcion &&
            !tipo &&
            (!Array.isArray(semanas) || semanas.length === 0) &&
            !categoria;
        if (noHayCamposParaActualizar) {
            return res.status(400).json({ mensaje: 'Al menos un campo debe ser actualizado' });
        }

        if (tipo && !['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'].includes(tipo.toLowerCase())) {
            return res.status(400).json({ mensaje: 'Tipo de planificación inválido' });
        }

        // Buscar la planificación por ID
        if (!req.params.id) {
            return res.status(400).json({ mensaje: 'ID de planificación es obligatorio' });
        }
        const plan = await Planificacion.findById(req.params.id);
        if (!plan) return res.status(404).json({ mensaje: 'Planificación no encontrada' });

        if (titulo) plan.titulo = titulo;
        if (descripcion) plan.descripcion = descripcion;
        if (tipo) plan.tipo = tipo;
        if (req.body.semanas) plan.semanas = req.body.semanas;
        if (categoria) {
            const categoriasValidas = ['basica', 'personalizada'];
            if (!categoriasValidas.includes(categoria)) {
                return res.status(400).json({ mensaje: `Categoría inválida. Válidas: ${categoriasValidas.join(', ')}` });
            }
            plan.categoria = categoria;
        }

        await plan.save();
        res.status(200).json({ mensaje: 'Planificación actualizada con éxito', planificacion: plan });
    } catch (error) {
        console.error('Error al editar planificación:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

const obtenerBloquesDeSemana = async (req, res) => {
    const { id, numeroSemana } = req.params;

    if (!id || !numeroSemana) {
        return res.status(400).json({ mensaje: 'ID de planificación y número de semana son obligatorios' });
    }

    try {
        const plan = await Planificacion.findById(id).lean();
        if (!plan) return res.status(404).json({ mensaje: 'Planificación no encontrada' });

        const semana = plan.semanas.find(s => s.numero === parseInt(numeroSemana));
        if (!semana) return res.status(404).json({ mensaje: 'Semana no encontrada' });

        console.log('Bloques en semana:', semana.bloques);
        console.log('Tipo de primer ID:', typeof semana.bloques[0]);
        const bloques = await Bloque.find({ _id: { $in: semana.bloques } });
        console.log('Consultando bloques con IDs:', semana.bloques);

        const encontrados = await Bloque.find({ _id: { $in: semana.bloques } });

        console.log('Bloques encontrados:', encontrados.map(b => b._id.toString()));

        res.status(200).json(encontrados);

        //res.status(200).json(bloques);
    } catch (error) {
        console.error('Error al obtener bloques de la semana:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};


module.exports = {
    crearPlanificacion,
    obtenerPlanificaciones,
    obtenerPlanificacionPorId,
    eliminarBloqueDeSemana,
    eliminarPlanificacion,
    editarPlanificacion,
    obtenerBloquesDeSemana
};
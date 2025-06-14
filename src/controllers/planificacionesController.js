const Planificacion = require('../models/Planificacion');
const Bloque = require('../models/Bloque');

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
            .populate('creadoPor', 'nombre email rol')
            .lean(); // lo hace un objeto plano para modificarlo después

        if (!planificacion) {
            return res.status(404).json({ mensaje: 'Planificación no encontrada' });
        }

        // Hago el populate manual de bloques en cada semana
        for (const semana of planificacion.semanas) {
            semana.bloques = await Bloque.find({ _id: { $in: semana.bloques } });
        }

        res.status(200).json(planificacion);
    } catch (error) {
        console.error('Error al obtener planificación:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
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
        const { titulo, descripcion, tipo, semanas } = req.body;

        const noHayCamposParaActualizar =
            !titulo &&
            !descripcion &&
            !tipo &&
            (!Array.isArray(semanas) || semanas.length === 0);
            
        if (noHayCamposParaActualizar) {
            return res.status(400).json({ mensaje: 'Al menos un campo debe ser actualizado' });
        }

        if (tipo && !['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'].includes(tipo.toLowerCase())) {
            return res.status(400).json({ mensaje: 'Tipo de planificación inválido' });
        }
        // Convertir tipo a minúsculas si se proporciona
        const tipoLower = tipo ? tipo.toLowerCase() : null;

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
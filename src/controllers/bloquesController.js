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

  try {
    // Valido los datos de entrada
    if (!dia || !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].includes(dia)) {
      return res.status(400).json({ 
        success: false,
        message: 'Día de la semana inválido' 
      });
    }

    const [plan, bloque] = await Promise.all([
      mongoose.model('Planificacion').findById(idPlanificacion),
      mongoose.model('Bloque').findById(idBloque)
    ]);

    if (!plan) throw new Error('Planificación no encontrada');
    if (!bloque) throw new Error('Bloque no encontrado');

    // Busco o creo semana
    let semana = plan.semanas.find(s => s.numero === parseInt(numeroSemana));
    if (!semana) {
      semana = { numero: parseInt(numeroSemana), dias: [] };
      plan.semanas.push(semana);
    }

    // Busco o creo día
    let diaObj = semana.dias.find(d => d.nombre === dia);
    if (!diaObj) {
      diaObj = { nombre: dia, bloques: [] };
      semana.dias.push(diaObj);
    }

    // Valido bloque duplicado
    if (diaObj.bloques.some(b => b.toString() === idBloque)) {
      return res.status(400).json({
        success: false,
        message: 'Este bloque ya está asignado al día'
      });
    }

    // Asigno bloque
    diaObj.bloques.push(new mongoose.Types.ObjectId(idBloque));

    await plan.save();
    
    res.json({
      success: true,
      message: `Bloque asignado al ${dia}`,
      data: {
        semana: semana.numero,
        dia: diaObj.nombre,
        bloque: {
          id: bloque._id,
          tipo: bloque.tipo
        }
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error del servidor'
    });
  }
};


module.exports = {
    crearBloque,
    agregarBloqueADia
};

const Reserva = require('../models/Reserva');
const mongoose = require('mongoose');
const { generarSlotsDisponibles, esHorarioValido } = require('../utils/horarios');

// Obtener disponibilidad
const obtenerDisponibilidad = async (req, res) => {
    try {
        const { fecha, sucursal } = req.query;

        const fechaObj = new Date(fecha);

        // Valido existencia de fecha y sucursal
        if (!fecha || isNaN(fechaObj.getTime())) {
            return res.status(400).json({ error: 'Fecha inválida' });
        }
        if (!sucursal || !['malvin', 'blanqueada'].includes(sucursal)) {
            return res.status(400).json({ error: 'Sucursal inválida' });
        }

        // Generar todos los slots posibles para la fecha y sucursal
        const slotsPosibles = generarSlotsDisponibles(new Date(fechaObj));

        // Obtener reservas existentes para estos slots
        const inicioDia = new Date(fechaObj);
        inicioDia.setHours(0, 0, 0, 0);

        const finDia = new Date(fechaObj);
        finDia.setHours(23, 59, 59, 999);

        const reservas = await Reserva.find({
            fecha: { $gte: inicioDia, $lte: finDia },
            sucursal,
            estado: 'activa'
        });

        // Calcular disponibilidad por tipo
        const disponibilidad = slotsPosibles.map(slot => {
            const reservasSlot = reservas.filter(r =>
                r.fecha.getTime() === slot.getTime()
            );

            return {
                horario: slot,
                salud: 12 - reservasSlot.filter(r => r.tipo === 'salud').length,
                openbox: 12 - reservasSlot.filter(r => r.tipo === 'openbox').length
            };
        });

        res.json(disponibilidad);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener disponibilidad', message: error.message });
    }
};

// Crear reserva
const crearReserva = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { fecha, tipo, sucursal } = req.body;
        const usuarioId = req.usuario.id; // Del middleware de autenticación

        const fechaReserva = new Date(fecha);

        // Valido horario
        if (!esHorarioValido(fechaReserva)) {
            return res.status(400).json({ error: 'Horario no válido' });
        }

        // Valido que no tenga otra reserva en mismo horario
        const reservaExistente = await Reserva.findOne({
            usuario: usuarioId,
            fecha: fechaReserva,
            estado: 'activa'
        });

        if (reservaExistente) {
            return res.status(400).json({
                error: 'Ya tienes una reserva en este horario',
                reservaExistente
            });
        }

        // Valido disponibilidad en slot
        const inicioSlot = new Date(fechaReserva);
        const finSlot = new Date(fechaReserva);
        finSlot.setHours(finSlot.getHours() + 1);

        const reservasEnSlot = await Reserva.countDocuments({
            fecha: { $gte: inicioSlot, $lt: finSlot },
            tipo,
            sucursal,
            estado: 'activa'
        });

        if (reservasEnSlot >= 12) {
            return res.status(400).json({ error: 'No hay cupo disponible' });
        }

        // Creo la reserva
        const nuevaReserva = new Reserva({
            usuario: usuarioId,
            fecha: fechaReserva,
            tipo,
            sucursal
        });

        await nuevaReserva.save({ session });
        await session.commitTransaction();

        res.status(201).json(nuevaReserva);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Error al crear reserva' });
    } finally {
        session.endSession();
    }
};

// Obtener reservas del usuario, desde hoy en adelante
// Incluye reservas del día actual
const obtenerMisReservas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const ahora = new Date();
        
        // Obtener reservas futuras (incluyendo las del día actual)
        const reservas = await Reserva.find({ 
            usuario: usuarioId,
            estado: 'activa',
            fecha: { $gte: new Date(ahora.setHours(0, 0, 0, 0)) } // Desde inicio del día actual
        }).sort({ fecha: 1 });

        res.json(reservas);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
};

// Eliminar reserva
const eliminarReserva = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    try {
        const reserva = await Reserva.findOneAndUpdate(
            { _id: id, usuario: usuarioId, estado: 'activa' },
            { estado: 'cancelada' },
            { new: true }
        );

        if (!reserva) {
            return res.status(404).json({ error: 'Reserva no encontrada o ya cancelada' });
        }

        res.json(reserva);
    } catch (error) {
        res.status(500).json({ error: 'Error al cancelar reserva' });
    }
};

// Obtener todas las reservas (solo para admin y coach), con paginación y filtro por fecha
const obtenerTodasReservas = async (req, res) => {
    const { fecha, sucursal, tipo } = req.query;

    try {
        const query = { estado: 'activa' };

        if (fecha) {
            const fechaObj = new Date(fecha);
            query.fecha = { $gte: new Date(fechaObj.setHours(0, 0, 0, 0)), $lt: new Date(fechaObj.setHours(23, 59, 59, 999)) };
        }

        if (sucursal) {
            query.sucursal = sucursal;
        }

        if (tipo) {
            query.tipo = tipo;
        }

        const reservas = await Reserva.find(query)
            .populate('usuario', 'nombre email') // Popula solo los campos necesarios
            .sort({ fecha: 1 });

        res.json(reservas);
    } catch (error) {
        console.error('Error al obtener todas las reservas:', error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
};

module.exports = {
    obtenerDisponibilidad,
    crearReserva,
    obtenerMisReservas,
    eliminarReserva,
    obtenerTodasReservas
};
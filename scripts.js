// Script de MONGO para crear 6 planificaciones por cada tipo, todas de categoria basica
const mongoose = require('mongoose');
const Planificacion = require('./src/models/Planificacion');
const conectarDB = require('./src/config/db');
require('dotenv').config();

// Tipos de planificación a crear
const tiposPlanificacion = ['fuerza', 'hipertrofia', 'crossfit', 'running', 'hibrido', 'gap'];

conectarDB();

const crearPlanificaciones = async () => {
    try {

        for (const tipo of tiposPlanificacion) {
            const nuevaPlanificacion = new Planificacion({
                titulo: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} Plan`,
                descripcion: `Descripción del plan de ${tipo}`,
                tipo,
                categoria: 'basica',
                semanas: [
                    {
                        numero: 1,
                        dias: [
                            { nombre: 'Lunes', bloques: [], descanso: false },
                            { nombre: 'Martes', bloques: [], descanso: false },
                            { nombre: 'Miércoles', bloques: [], descanso: false },
                            { nombre: 'Jueves', bloques: [], descanso: false },
                            { nombre: 'Viernes', bloques: [], descanso: false },
                            { nombre: 'Sábado', bloques: [], descanso: true },
                            { nombre: 'Domingo', bloques: [], descanso: true }
                        ]
                    }
                ],
                creadoPorSnapshot: {
                    nombre: 'Admin',
                    email: 'nahuel@example.com',
                    rol: 'admin'
                },
                creadoPor: '6847072d64f096c2ee4e7ff9',
                fechaCreacion: new Date()
            });
            await nuevaPlanificacion.save();
            console.log(`Planificación ${nuevaPlanificacion.titulo} creada exitosamente`);
        }
        console.log('Todas las planificaciones creadas exitosamente');
    } catch (error) {
        console.error('Error al crear las planificaciones:', error);
    }
}

crearPlanificaciones();
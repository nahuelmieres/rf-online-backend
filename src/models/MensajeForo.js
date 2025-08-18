const mongoose = require('mongoose');

const mensajeForoSchema = new mongoose.Schema({
    planificacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Planificacion', required: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    contenido: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
});

module.exports = mongoose.model('MensajeForo', mensajeForoSchema);
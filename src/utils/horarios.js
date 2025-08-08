// Genera slots disponibles para una fecha específica (manejo correcto de fechas)
const generarSlotsDisponibles = (fecha) => {
  // Crear nueva fecha para no modificar la original
  const fechaBase = new Date(fecha);
  const dia = fechaBase.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
  const slots = [];

  // Domingo: cerrado
  if (dia === 0) return slots;

  // Sábados: 10:00 a 13:00
  if (dia === 6) {
    for (let hora = 10; hora < 13; hora++) {
      const slot = new Date(fechaBase);
      slot.setHours(hora, 0, 0, 0);
      slots.push(slot);
    }
    return slots;
  }

  // Lunes a Viernes
  // Mañana: 7:00 a 12:00
  for (let hora = 7; hora < 12; hora++) {
    const slot = new Date(fechaBase);
    slot.setHours(hora, 0, 0, 0);
    slots.push(slot);
  }

  // Tarde: 16:00 a 22:00
  for (let hora = 16; hora < 22; hora++) {
    const slot = new Date(fechaBase);
    slot.setHours(hora, 0, 0, 0);
    slots.push(slot);
  }

  return slots;
};

// Valida si un horario es válido (versión optimizada)
const esHorarioValido = (fechaHora) => {
  const hora = fechaHora.getHours();
  const dia = fechaHora.getDay();

  switch (dia) {
    case 0: // Domingo
      return false;
    case 6: // Sábado
      return hora >= 10 && hora < 13;
    default: // Lunes a Viernes
      return (hora >= 7 && hora < 12) || (hora >= 16 && hora < 22);
  }
};

module.exports = {
  generarSlotsDisponibles,
  esHorarioValido
};
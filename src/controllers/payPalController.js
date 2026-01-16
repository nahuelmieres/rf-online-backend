const { 
  crearSuscripcionBasico: crearSuscripcionBasicoService, 
  crearSuscripcionPersonalizado: crearSuscripcionPersonalizadoService, 
  procesarWebhookPaypal
} = require('../services/payPalServices');

// SUSCRIPCIÓN BÁSICA - $31.99/mes
const crearSuscripcionBasico = async (req, res) => {
  try {
    const { usuario } = req;
    
    const paypalSubscription = await crearSuscripcionBasicoService(usuario);
    
    // Encontrar el link de aprobación
    const approvalLink = paypalSubscription.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      throw new Error('No se pudo generar el link de aprobación');
    }

    res.status(200).json({ 
      subscriptionID: paypalSubscription.id,
      approvalUrl: approvalLink.href 
    });
  } catch (error) {
    console.error('Error al crear suscripción básica:', error);
    
    if (error.message === 'Ya tenés una suscripción activa o en proceso') {
      return res.status(400).json({ 
        mensaje: error.message,
        code: 'SUBSCRIPTION_ALREADY_EXISTS'
      });
    }
    
    res.status(500).json({ 
      mensaje: 'Error del servidor al crear suscripción',
      error: error.message 
    });
  }
};

// SUSCRIPCIÓN PERSONALIZADA - $99.99/mes
const crearSuscripcionPersonalizado = async (req, res) => {
  try {
    const { usuario } = req;
    const { questionnaire } = req.body;

    // Validación básica (la validación detallada está en el servicio)
    if (!questionnaire) {
      return res.status(400).json({ 
        mensaje: 'El cuestionario es requerido',
        code: 'QUESTIONNAIRE_REQUIRED'
      });
    }

    const paypalSubscription = await crearSuscripcionPersonalizadoService(usuario, questionnaire);
    
    const approvalLink = paypalSubscription.links.find(link => link.rel === 'approve');
    
    if (!approvalLink) {
      throw new Error('No se pudo generar el link de aprobación');
    }

    res.status(200).json({ 
      subscriptionID: paypalSubscription.id,
      approvalUrl: approvalLink.href 
    });
  } catch (error) {
    console.error('Error al crear suscripción personalizada:', error);
    
    // Manejar diferentes tipos de error
    if (error.message === 'Ya tenés una suscripción activa o en proceso') {
      return res.status(400).json({ 
        mensaje: error.message,
        code: 'SUBSCRIPTION_ALREADY_EXISTS'
      });
    }

    if (error.message.includes('es requerido') || 
        error.message.includes('inválido') ||
        error.message.includes('no puede exceder')) {
      return res.status(400).json({ 
        mensaje: error.message,
        code: 'INVALID_QUESTIONNAIRE'
      });
    }
    
    res.status(500).json({ 
      mensaje: 'Error del servidor al crear suscripción personalizada',
      error: error.message 
    });
  }
};

// Webhook de notificaciones PayPal (mantenemos igual)
const webhookPaypal = async (req, res) => {
  await procesarWebhookPaypal(req, res);
};

// ELIMINAMOS las funciones viejas que ya no usamos
// generarOrdenPaypal, capturarPagoPaypal

module.exports = {
  crearSuscripcionBasico,
  crearSuscripcionPersonalizado,
  webhookPaypal
};
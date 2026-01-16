const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const mongoose = require('mongoose');
const { addMonths } = require('date-fns');
const Pago = require('../models/Pago');
const Usuario = require('../models/Usuario');
const Subscription = require('../models/Subscription');
const PlanRequest = require('../models/PlanRequest');

// Configuración de PayPal
const PAYPAL_API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Función para obtener access token de PayPal
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(`${PAYPAL_API_BASE}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error obteniendo access token de PayPal:', error.response?.data || error.message);
    throw new Error('No se pudo conectar con PayPal');
  }
}

// Función para hacer llamadas a la API de PayPal
async function callPayPalAPI(method, endpoint, data = null) {
  try {
    const accessToken = await getPayPalAccessToken();
    
    const config = {
      method,
      url: `${PAYPAL_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error en llamada a PayPal API:', {
      endpoint,
      error: error.response?.data || error.message
    });
    throw error;
  }
}

// SUSCRIPCIÓN BÁSICA - $31.99/mes CON TRANSACCIÓN
const crearSuscripcionBasico = async (usuario) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`[TRANSACTION] Iniciando suscripción básica para usuario: ${usuario.id}`);
    
    // Verificar si ya tiene suscripción activa
    const existingSub = await Subscription.findOne({
      usuario: usuario.id,
      estado: { $in: ['active', 'waiting_payment'] }
    }).session(session);

    if (existingSub) {
      throw new Error('Ya tenés una suscripción activa o en proceso');
    }

    // Crear suscripción en PayPal usando Axios
    const subscriptionData = {
      plan_id: process.env.PAYPAL_PLAN_BASICO_ID,
      custom_id: usuario.id.toString(),
      application_context: {
        brand_name: 'RF Online',
        locale: 'es-ES',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.FRONTEND_URL}/subscription/success`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`
      }
    };

    const paypalSubscription = await callPayPalAPI(
      'POST', 
      '/v1/billing/subscriptions', 
      subscriptionData
    );

    // Crear suscripción en nuestra DB
    const currentDate = new Date();
    const subscription = await Subscription.create([{
      usuario: usuario.id,
      estado: 'waiting_payment',
      plan: 'basico',
      provider: 'paypal',
      providerSubscriptionId: paypalSubscription.id,
      precio: 31.99,
      currentPeriodStart: currentDate,
      currentPeriodEnd: addMonths(currentDate, 1),
      cancelAtPeriodEnd: false
    }], { session });

    // Actualizar usuario
    await Usuario.findByIdAndUpdate(usuario.id, {
      subscription: subscription[0]._id
    }, { session });

    // Crear registro en Pago
    await Pago.create([{
      usuario: usuario.id,
      tipo: 'suscripcion',
      externalId: paypalSubscription.id,
      monto: 31.99,
      moneda: 'USD',
      metodo: 'paypal',
      estado: 'pendiente'
    }], { session });

    // CONFIRMAR TRANSACCIÓN
    await session.commitTransaction();
    console.log(`[TRANSACTION] Suscripción básica creada exitosamente para usuario: ${usuario.id}`);

    return paypalSubscription;
  } catch (error) {
    // REVERTIR TRANSACCIÓN en caso de error
    await session.abortTransaction();
    console.error('[TRANSACTION] Error en crearSuscripcionBasico:', error.response?.data || error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

// SUSCRIPCIÓN PERSONALIZADA - $99.99/mes CON TRANSACCIÓN
const crearSuscripcionPersonalizado = async (usuario, questionnaire) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`[TRANSACTION] Iniciando suscripción personalizada para usuario: ${usuario.id}`);
    
    // Verificar si ya tiene suscripción activa
    const existingSub = await Subscription.findOne({
      usuario: usuario.id,
      estado: { $in: ['active', 'waiting_payment'] }
    }).session(session);

    if (existingSub) {
      throw new Error('Ya tenés una suscripción activa o en proceso');
    }

    // VALIDACIÓN COMPLETA DEL QUESTIONNAIRE
    if (!questionnaire) {
      throw new Error('El cuestionario es requerido');
    }

    const camposRequeridos = [
      'objetivo', 'nivel', 'lesiones', 'equipamiento', 'preferencias'
    ];

    for (const campo of camposRequeridos) {
      if (!questionnaire[campo] || questionnaire[campo].trim() === '') {
        throw new Error(`El campo ${campo} es requerido`);
      }
    }

    // Validar disponibilidad
    if (!questionnaire.disponibilidad) {
      throw new Error('La disponibilidad es requerida');
    }

    const { disponibilidad } = questionnaire;
    if (!disponibilidad.diasPorSemana || disponibilidad.diasPorSemana < 1 || disponibilidad.diasPorSemana > 7) {
      throw new Error('Los días por semana deben ser entre 1 y 7');
    }

    if (!disponibilidad.minutosPorDia || disponibilidad.minutosPorDia < 15 || disponibilidad.minutosPorDia > 180) {
      throw new Error('Los minutos por día deben ser entre 15 y 180');
    }

    if (!disponibilidad.diasPreferidos || !Array.isArray(disponibilidad.diasPreferidos) || disponibilidad.diasPreferidos.length === 0) {
      throw new Error('Los días preferidos son requeridos');
    }

    // Validar nivel
    const nivelesValidos = ['principiante', 'intermedio', 'avanzado'];
    if (!nivelesValidos.includes(questionnaire.nivel)) {
      throw new Error('Nivel inválido. Debe ser: principiante, intermedio o avanzado');
    }

    // Validar longitud de campos de texto
    if (questionnaire.objetivo.length > 100) {
      throw new Error('El objetivo no puede exceder 100 caracteres');
    }

    if (questionnaire.lesiones.length > 500) {
      throw new Error('La información de lesiones no puede exceder 500 caracteres');
    }

    if (questionnaire.equipamiento.length > 200) {
      throw new Error('El equipamiento no puede exceder 200 caracteres');
    }

    if (questionnaire.preferencias.length > 500) {
      throw new Error('Las preferencias no pueden exceder 500 caracteres');
    }

    // Crear suscripción en PayPal usando Axios
    const subscriptionData = {
      plan_id: process.env.PAYPAL_PLAN_PERSONALIZADO_ID,
      custom_id: usuario.id.toString(),
      application_context: {
        brand_name: 'RF Online',
        locale: 'es-ES',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.FRONTEND_URL}/personalized/success`,
        cancel_url: `${process.env.FRONTEND_URL}/personalized/cancel`
      }
    };

    const paypalSubscription = await callPayPalAPI(
      'POST', 
      '/v1/billing/subscriptions', 
      subscriptionData
    );

    // Crear suscripción en nuestra DB
    const currentDate = new Date();
    const subscription = await Subscription.create([{
      usuario: usuario.id,
      estado: 'waiting_payment',
      plan: 'personalizado',
      provider: 'paypal',
      providerSubscriptionId: paypalSubscription.id,
      precio: 99.99,
      currentPeriodStart: currentDate,
      currentPeriodEnd: addMonths(currentDate, 1),
      cancelAtPeriodEnd: false
    }], { session });

    // Crear PlanRequest para el cuestionario
    const planRequest = await PlanRequest.create([{
      usuario: usuario.id,
      subscription: subscription[0]._id,
      estado: 'pending',
      questionnaire: {
        objetivo: questionnaire.objetivo.trim(),
        nivel: questionnaire.nivel,
        lesiones: questionnaire.lesiones.trim(),
        equipamiento: questionnaire.equipamiento.trim(),
        disponibilidad: {
          diasPorSemana: disponibilidad.diasPorSemana,
          minutosPorDia: disponibilidad.minutosPorDia,
          diasPreferidos: disponibilidad.diasPreferidos
        },
        preferencias: questionnaire.preferencias.trim()
      },
      timeline: [{ event: 'created', at: new Date() }]
    }], { session });

    // Actualizar usuario
    await Usuario.findByIdAndUpdate(usuario.id, {
      subscription: subscription[0]._id,
      planRequest: planRequest[0]._id
    }, { session });

    // Crear registro en Pago
    await Pago.create([{
      usuario: usuario.id,
      tipo: 'suscripcion',
      externalId: paypalSubscription.id,
      monto: 99.99,
      moneda: 'USD',
      metodo: 'paypal',
      estado: 'pendiente'
    }], { session });

    // CONFIRMAR TRANSACCIÓN
    await session.commitTransaction();
    console.log(`[TRANSACTION] Suscripción personalizada creada exitosamente para usuario: ${usuario.id}`);

    return paypalSubscription;
  } catch (error) {
    // REVERTIR TRANSACCIÓN en caso de error
    await session.abortTransaction();
    console.error('[TRANSACTION] Error en crearSuscripcionPersonalizado:', error.response?.data || error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

const procesarWebhookPaypal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const valido = await validarFirmaWebhook(req);
    if (!valido) {
      await session.abortTransaction();
      console.error('[WEBHOOK] Firma inválida');
      return res.status(401).send('Firma inválida');
    }

    const { event_type, resource } = req.body;
    console.log('[WEBHOOK] Evento recibido:', event_type, 'ID:', resource.id);

    switch (event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource, session);
        break;
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource, session);
        break;
      
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(resource, session);
        break;
      
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource, session);
        break;
      
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePaymentFailed(resource, session);
        break;
      
      default:
        console.log('[WEBHOOK] Evento no manejado:', event_type);
    }

    await session.commitTransaction();
    console.log('[WEBHOOK] Procesamiento completado para:', event_type);
    res.sendStatus(200);
  } catch (error) {
    await session.abortTransaction();
    console.error('[WEBHOOK] Error procesando webhook:', error);
    res.sendStatus(500);
  } finally {
    session.endSession();
  }
};

// Funciones auxiliares para cada evento
const handleSubscriptionActivated = async (resource, session) => {
  const subscriptionId = resource.id;
  const customId = resource.custom_id; // Este es el ID de usuario
  
  console.log('[WEBHOOK] Activando suscripción:', subscriptionId, 'Usuario:', customId);

  // Buscar por providerSubscriptionId O por custom_id
  const subscription = await Subscription.findOne({
    $or: [
      { providerSubscriptionId: subscriptionId },
      { usuario: customId }
    ]
  }).session(session);

  if (!subscription) {
    console.error('[WEBHOOK] No se encontró suscripción con ID:', subscriptionId);
    return;
  }

  const paymentTime = new Date(resource.billing_info.last_payment.time);
  
  // Actualizar suscripción
  await Subscription.findByIdAndUpdate(
    subscription._id,
    {
      estado: 'active',
      currentPeriodStart: paymentTime,
      currentPeriodEnd: addMonths(paymentTime, 1),
      cancelAtPeriodEnd: false,
      providerSubscriptionId: subscriptionId // Asegurar que tenga el ID correcto
    },
    { session }
  );

  // Actualizar o crear pago
  await Pago.findOneAndUpdate(
    { 
      $or: [
        { externalId: subscriptionId },
        { externalId: subscription.providerSubscriptionId },
        { usuario: customId, tipo: 'suscripcion', estado: 'pendiente' }
      ]
    },
    { 
      estado: 'aprobado',
      paymentId: resource.billing_info.last_payment.id,
      externalId: subscriptionId, // Actualizar al ID final
      fecha: paymentTime
    },
    { session, upsert: true }
  );

  console.log('[WEBHOOK] Suscripción activada exitosamente:', subscriptionId);
};

const handlePaymentCompleted = async (resource, session) => {
  const billingAgreementId = resource.billing_agreement_id;
  
  if (!billingAgreementId) {
    console.log('[WEBHOOK] PAYMENT.SALE.COMPLETED sin billing_agreement_id');
    return;
  }

  const subscription = await Subscription.findOne({
    providerSubscriptionId: billingAgreementId
  }).session(session);

  if (subscription) {
    // Registrar pago recurrente
    await Pago.create([{
      usuario: subscription.usuario,
      tipo: 'suscripcion',
      externalId: resource.id,
      paymentId: resource.id,
      monto: resource.amount.total,
      moneda: resource.amount.currency,
      metodo: 'paypal',
      estado: 'aprobado',
      fecha: new Date(resource.create_time)
    }], { session });

    // Actualizar período de suscripción
    const paymentTime = new Date(resource.create_time);
    await Subscription.findByIdAndUpdate(subscription._id, {
      currentPeriodStart: paymentTime,
      currentPeriodEnd: addMonths(paymentTime, 1)
    }, { session });

    console.log('[WEBHOOK] Pago recurrente registrado:', resource.id);
  }
};

const handleSubscriptionCancelled = async (resource, session) => {
  await Subscription.findOneAndUpdate(
    { providerSubscriptionId: resource.id },
    { estado: 'canceled' },
    { session }
  );
  console.log('[WEBHOOK] Suscripción cancelada:', resource.id);
};

const handleSubscriptionExpired = async (resource, session) => {
  await Subscription.findOneAndUpdate(
    { providerSubscriptionId: resource.id },
    { estado: 'expired' },
    { session }
  );
  console.log('[WEBHOOK] Suscripción expirada:', resource.id);
};

const handlePaymentFailed = async (resource, session) => {
  console.log('[WEBHOOK] Pago fallido:', resource);
  // Aquí podrías manejar pagos fallidos si lo necesitas
};

// Funciones auxiliares para webhook (mantenemos igual)
const obtenerCertificado = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const validarFirmaWebhook = async (req) => {
  const sig = req.headers['paypal-transmission-sig'];
  const time = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const algo = req.headers['paypal-auth-algo'];
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!sig || !time || !certUrl || !algo) {
    console.error('Faltan headers para validar la firma');
    return false;
  }

  const body = req.rawBody;
  const mensaje = `${time}|${webhookId}|${body}`;

  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(mensaje);

  const cert = await obtenerCertificado(certUrl);
  return verify.verify(cert, sig, 'base64');
};

module.exports = {
  crearSuscripcionBasico,
  crearSuscripcionPersonalizado,
  procesarWebhookPaypal
};
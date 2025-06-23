const paypal = require('@paypal/checkout-server-sdk');
const crypto = require('crypto');

// Configuro entorno de PayPal
const environment = process.env.NODE_ENV === 'production'
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );

const client = new paypal.core.PayPalHttpClient(environment);

// Creo la orden de pago
const crearOrdenPaypal = async (monto) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: monto.toString()
        }
      }
    ],
    application_context: {
      brand_name: 'RF Online',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'https://rf-online.com/paypal/success',
      cancel_url: 'https://rf-online.com/paypal/cancel'
    }
  });

  const response = await client.execute(request);
  return response.result;
};

// Capturo la orden después de la aprobación del usuario
const capturarOrdenPaypal = async (orderId) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
};

// Valido firma de webhook de PayPal
const validarFirmaWebhook = async (req) => {
  const cabeceraFirma = req.headers['paypal-transmission-sig'];
  const cabeceraTimestamp = req.headers['paypal-transmission-time'];
  const cabeceraCertUrl = req.headers['paypal-cert-url'];
  const cabeceraAlgoritmo = req.headers['paypal-auth-algo'];
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  if (!cabeceraFirma || !cabeceraTimestamp || !cabeceraCertUrl || !cabeceraAlgoritmo) {
    console.error('Cabeceras de verificación faltantes');
    return false;
  }

  // Construyo mensaje para verificación
  const mensajeVerificacion = `${cabeceraTimestamp}|${webhookId}|${req.rawBody}`;
  
  // Verifico la firma
  const verificar = crypto.createVerify('RSA-SHA256');
  verificar.update(mensajeVerificacion);
  
  // Descargo certificado (en producción usar caché)
  const certificado = await obtenerCertificado(cabeceraCertUrl);
  
  return verificar.verify(certificado, cabeceraFirma, 'base64');
};

// Obtengo certificado desde URL de PayPal
const obtenerCertificado = (url) => {
  // En producción, tengo que implementar caché para evitar descargas repetidas
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

// Proceso notificaciones de webhook
const procesarWebhookPaypal = async (req, res) => {
  try {
    // Valido firma primero
    const esValido = await validarFirmaWebhook(req);
    if (!esValido) {
      console.error('Firma de webhook inválida');
      return res.status(401).send('Firma inválida');
    }

    // Proceso evento según tipo
    const tipoEvento = req.body.event_type;
    const recurso = req.body.resource;
    
    switch(tipoEvento) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        // Manejo pago completado
        console.log('Pago capturado:', recurso.id);
        await actualizarEstadoPago(recurso.id, 'completado');
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        // Manejo pago rechazado
        console.log('Pago rechazado:', recurso.id);
        await actualizarEstadoPago(recurso.id, 'rechazado');
        break;
        
      default:
        console.log('Evento no manejado:', tipoEvento);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook PayPal:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  crearOrdenPaypal,
  capturarOrdenPaypal,
  procesarWebhookPaypal
};
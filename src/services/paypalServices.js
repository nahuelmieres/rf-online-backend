const paypal = require('@paypal/checkout-server-sdk');
const crypto = require('crypto');
const https = require('https');
const Pago = require('../models/Pago');
const Usuario = require('../models/Usuario');

// Configuración del entorno
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

// Creo orden PayPal y guardo en DB
const crearOrdenPaypal = async (usuario, monto) => {
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
  const orden = response.result;

  await Pago.create({
    usuario: usuario.id,
    externalId: orden.id,
    estado: 'pendiente',
    monto,
    moneda: 'USD',
    metodo: 'paypal'
  });

  return orden;
};

// Capturo la orden PayPal y actualizo estado
const capturarOrdenPaypal = async (orderId) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  const captura = response.result;

  if (captura.status === 'COMPLETED') {
    await Pago.findOneAndUpdate(
      { externalId: orderId },
      { estado: 'aprobado' }
    );

    const pago = await Pago.findOne({ externalId: orderId });
    if (pago) {
      await Usuario.findByIdAndUpdate(pago.usuario, { estadoPago: true });
    }
  }

  return captura;
};

// Obtengo certificado remoto
const obtenerCertificado = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

// Valido la firma del webhook
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

// Proceso evento del webhook
const procesarWebhookPaypal = async (req, res) => {
  try {
    // Comentar para validar firma del webhook
    // const valido = true; 
    // Comentar para pruebas sin firma
    const valido = await validarFirmaWebhook(req);
    if (!valido) {
      return res.status(401).send('Firma inválida');
    }

    const { event_type, resource } = req.body;

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      await Pago.findOneAndUpdate(
        { externalId: resource.supplementary_data.related_ids.order_id },
        { estado: 'aprobado' }
      );

      const pago = await Pago.findOne({ externalId: resource.supplementary_data.related_ids.order_id });
      if (pago) {
        await Usuario.findByIdAndUpdate(pago.usuario, { estadoPago: true });
      }

      console.log('Pago aprobado por webhook:', resource.id);
    }

    if (event_type === 'PAYMENT.CAPTURE.DENIED') {
      await Pago.findOneAndUpdate(
        { externalId: resource.supplementary_data.related_ids.order_id },
        { estado: 'rechazado' }
      );

      console.log('Pago rechazado por webhook:', resource.id);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando webhook PayPal:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  crearOrdenPaypal,
  capturarOrdenPaypal,
  procesarWebhookPaypal
};
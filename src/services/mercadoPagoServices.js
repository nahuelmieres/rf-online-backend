const { MercadoPagoConfig, Preference } = require('mercadopago');

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

console.log("TOKEN EN USO:", process.env.MERCADOPAGO_ACCESS_TOKEN);

const crearPreferencia = async (usuario, monto) => {
  try {
    const preferenceData = {
      items: [
        {
          title: "Suscripción RF Online",
          description: "Acceso a planificación personalizada",
          picture_url: "https://via.placeholder.com/150",
          quantity: 1,
          unit_price: Number(monto)
        }
      ],
      back_urls: {
        success: "https://rf-online.com/pago-exitoso",
        failure: "https://rf-online.com/pago-fallido",
        pending: "https://rf-online.com/pago-pendiente"
      },
      auto_return: "approved",
      metadata: {
        usuarioId: usuario.id
      },
      external_reference: usuario.id.toString() // Para asegurarme que sea un string
    };

    const client = new Preference(mp);
    const response = await client.create({ body: preferenceData });

    return response;
  } catch (error) {
    console.error("Error al generar preferencia MP:", error);
    throw error;
  }
};

module.exports = {
  crearPreferencia
};
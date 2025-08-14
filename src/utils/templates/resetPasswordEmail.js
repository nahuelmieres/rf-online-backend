function resetPasswordEmail({ resetUrl, userName }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:24px;border:2px solid #000">
    <!-- Encabezado RF ONLINE -->
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px 0;letter-spacing:1px">RF ONLINE</h1>
      <div style="height:2px;background:#000;margin:0 auto 16px;width:80px"></div>
      <h2 style="font-size:20px;font-weight:600;margin:0">PLATAFORMA DE ENTRENAMIENTO</h2>
    </div>

    <!-- Contenido del email -->
    <h2 style="margin:0 0 16px 0;font-size:18px;border-bottom:2px solid #000;padding-bottom:8px">Restablecer contraseña</h2>
    <p>Hola ${userName || ''},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón de abajo:</p>
    <p style="margin:24px 0">
      <a href="${resetUrl}"
         style="display:inline-block;padding:12px 18px;border:2px solid #000;background:#000;color:#fff;text-decoration:none;font-weight:bold">
        Restablecer contraseña
      </a>
    </p>
    <p>Si no solicitaste este cambio, ignorá este mensaje.</p>
    <p style="font-size:12px;color:#555">Este enlace expira en ${process.env.RESET_TOKEN_TTL_MIN || 60} minutos.</p>
  </div>`;
}

module.exports = { resetPasswordEmail };
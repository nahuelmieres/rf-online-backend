const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario'); // ajusta ruta
const { sendMail } = require('../utils/mailer');
const { resetPasswordEmail } = require('../utils/templates/resetPasswordEmail');

const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 60);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

// POST /api/auth/reset-password-request
// Body: { email }
const requestPasswordReset = async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ mensaje: 'Email inválido' });
  }

  // Respuesta neutra para no revelar si existe o no
  const neutralResponse = { mensaje: 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.' };

  try {
    const user = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json(neutralResponse);
    }

    // Genero token + hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const exp = new Date(Date.now() + TTL_MIN * 60 * 1000);

    user.resetTokenHash = hash;
    user.resetTokenExp = exp;
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendMail({
      to: user.email,
      subject: 'Restablecer contraseña',
      html: resetPasswordEmail({ resetUrl, userName: user.nombre || '' })
    });

    return res.json(neutralResponse);
  } catch (err) {
    console.error('Error requestPasswordReset:', err);
    return res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
  }
};

// POST /api/auth/reset-password
// Body: { email, token, newPassword }
const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body || {};
  if (!email || !token || !newPassword) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const user = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetTokenHash || !user.resetTokenExp) {
      return res.status(400).json({ mensaje: 'Token inválido o expirado' });
    }

    // Valido token/exp
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    if (hash !== user.resetTokenHash || now > user.resetTokenExp) {
      return res.status(400).json({ mensaje: 'Token inválido o expirado' });
    }

    // Seteo nueva contraseña
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    user.password = await bcrypt.hash(newPassword, salt);

    // Invalido token
    user.resetTokenHash = null;
    user.resetTokenExp = null;

    await user.save();

    return res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error resetPassword:', err);
    return res.status(500).json({ mensaje: 'Error al restablecer la contraseña' });
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword
};
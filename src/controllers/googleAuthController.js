const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// No pases el clientId aquí; no es necesario
const client = new OAuth2Client();

// Permitir 1..n client IDs (nuevo + viejo)
const ALLOWED_AUDIENCES = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

async function verifyIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    // Si definiste audiencias, Google las valida por vos
    audience: ALLOWED_AUDIENCES.length ? ALLOWED_AUDIENCES : undefined,
  });
  const payload = ticket.getPayload();
  return payload;
}

const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ mensaje: 'Falta idToken' });

    const payload = await verifyIdToken(idToken);
    const { sub: googleId, email, email_verified, name, picture, aud, iss } = payload || {};

    // Chequeo de issuer recomendado por Google
    const validIss = ['https://accounts.google.com', 'accounts.google.com'];
    if (!validIss.includes(iss)) {
      return res.status(401).json({ mensaje: 'Issuer inválido' });
    }

    // Si definiste audiencias, chequeo explícito (para mensaje claro)
    if (ALLOWED_AUDIENCES.length && !ALLOWED_AUDIENCES.includes(aud)) {
      return res.status(401).json({
        mensaje: `Token de Google inválido: Wrong recipient, payload audience (${aud}) != expected (${ALLOWED_AUDIENCES.join(' | ')})`,
      });
    }

    if (!email || !email_verified) {
      return res.status(400).json({ mensaje: 'Email no verificado por Google' });
    }

    // Buscar o crear usuario
    let user = await Usuario.findOne({
      $or: [{ email: email.toLowerCase() }, { googleId }]
    });

    if (!user) {
      user = new Usuario({
        nombre: name || 'Usuario',
        email: email.toLowerCase(),
        googleId,
        avatarUrl: picture || null,
        rol: 'cliente',
        aceptaTerminos: true,
      });
      await user.save();
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      if (!user.nombre && name) user.nombre = name;
      await user.save();
    }

    const tokenPayload = {
      id: user._id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
      planPersonalizado: user.planPersonalizado || null,
    };

    // IMPORTANTÍSIMO: JWT_SECRET debe ser MI secreto (no el client secret de Google)
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      mensaje: 'Login con Google exitoso',
      token,
      usuario: tokenPayload,
    });
  } catch (err) {
    console.error('Error en loginWithGoogle:', err);
    return res.status(401).json({ mensaje: err.message || 'Error en autenticación con Google' });
  }
};

module.exports = { loginWithGoogle };
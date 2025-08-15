const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyIdToken(idToken) {
    try {
        console.log('Verifying Google ID token:', idToken.substring(0, 20) + '...'); // Log parcial por seguridad

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        console.log('Google payload:', {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            email_verified: payload.email_verified
        });
        return payload;
    } catch (error) {
        console.error('Error verifying Google ID token:', error);
        throw new Error('Token de Google inválido: ' + error.message);
    }
}

const loginWithGoogle = async (req, res) => {
    try {
        const { idToken } = req.body || {};
        console.log('Received Google ID token:', idToken.substring(0, 20) + '...');

        if (!idToken) {
            return res.status(400).json({ mensaje: 'Falta idToken' });
        }

        const payload = await verifyIdToken(idToken);
        const { sub: googleId, email, email_verified, name, picture } = payload || {};

        if (!email || !email_verified) {
            return res.status(400).json({ mensaje: 'Email no verificado por Google' });
        }

        // Buscar usuario por email o googleId
        let user = await Usuario.findOne({
            $or: [
                { email: email.toLowerCase() },
                { googleId }
            ]
        });

        if (!user) {
            // Crear nuevo usuario
            user = new Usuario({
                nombre: name || 'Usuario',
                email: email.toLowerCase(),
                googleId,
                avatarUrl: picture || null,
                rol: 'cliente',
                aceptaTerminos: true
            });
            await user.save();
        } else {
            // Actualizar usuario existente
            if (!user.googleId) user.googleId = googleId;
            if (!user.avatarUrl && picture) user.avatarUrl = picture;
            if (!user.nombre && name) user.nombre = name;
            await user.save();
        }

        // Crear payload para el token - DEBE SER IGUAL AL LOGIN TRADICIONAL
        const tokenPayload = {
            id: user._id,
            email: user.email,
            rol: user.rol,
            nombre: user.nombre,
            planPersonalizado: user.planPersonalizado || null
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // Misma duración que el login con "rememberMe"
        );

        res.json({
            mensaje: 'Login con Google exitoso',
            token,
            usuario: tokenPayload // Usamos el mismo payload para mantener consistencia
        });
    } catch (err) {
        console.error('Error en loginWithGoogle:', err);
        res.status(401).json({
            mensaje: err.message || 'Error en autenticación con Google'
        });
    }
};

module.exports = { loginWithGoogle };
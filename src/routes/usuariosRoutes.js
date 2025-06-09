const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/usuariosController');
const verificarToken = require('../middlewares/authMiddleware');

router.post('/registrar', registrarUsuario);
router.post('/login', loginUsuario);

router.get('/privado', verificarToken, (req, res) => {
  res.json({
    mensaje: 'Accediste a una ruta protegida',
    usuario: req.usuario
  });
});

module.exports = router;
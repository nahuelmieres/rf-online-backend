const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: hashedPassword,
      rol
    });

    await nuevoUsuario.save();

    // No devolvemos la contraseña
    const { password: _, ...usuarioSinPassword } = nuevoUsuario.toObject();
    res.status(201).json(usuarioSinPassword);
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Valido campos
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña obligatorios' });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Creo payload para el token
    const payload = {
      id: usuario._id,
      email: usuario.email,
      rol: usuario.rol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Excluyo password del retorno
    const { password: _, ...usuarioSinPassword } = usuario.toObject();

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: usuarioSinPassword
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

const asignarPlanificacion = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ msg: 'Usuario no encontrado' });

    usuario.planificacion = req.params.idPlan;
    await usuario.save();

    res.json({ mensaje: 'Planificación asignada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

const obtenerPerfil = async (req, res) => {
  try {
    // Obtengo solo datos básicos del usuario + referencia a planificación
    const usuario = await Usuario.findById(req.usuario.id)
      .select('-password -__v')
      .populate({
        path: 'planificacion',
        select: '_id titulo tipo' // Solo estos campos básicos
      })
      .lean();

    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }

    // Respuesta simplificada
    const respuesta = {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estadoPago: usuario.estadoPago
      },
      planificacion: usuario.planificacion ? {
        id: usuario.planificacion._id,
        titulo: usuario.planificacion.titulo,
        tipo: usuario.planificacion.tipo
      } : null
    };

    res.json({
      success: true,
      data: respuesta
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const { rol, estadoPago, search, nombre, email } = req.query;
    const query = {};
    
    // Filtros individuales
    if (rol) query.rol = rol;
    if (estadoPago) query.estadoPago = estadoPago;
    if (nombre) query.nombre = { $regex: nombre, $options: 'i' }; // Búsqueda exacta por nombre
    if (email) query.email = { $regex: email, $options: 'i' }; // Búsqueda exacta por email
    
    // Búsqueda global (search)
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [usuarios, total] = await Promise.all([
      Usuario.find(query)
        .select('-password -__v')
        .skip(skip)
        .limit(limit)
        .lean(),
      Usuario.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: { usuarios, pagination: { total, page, limit } }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  asignarPlanificacion,
  obtenerPerfil,
  obtenerUsuarios 
};

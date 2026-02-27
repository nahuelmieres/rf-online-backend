const Usuario = require('../models/Usuario');
const Planificacion = require('../models/Planificacion');
const PlanRequest = require('../models/PlanRequest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'cliente', aceptaTerminos } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El usuario ya está registrado' });
    }

    if (!aceptaTerminos) {
      return res.status(400).json({ mensaje: 'Debe aceptar los términos y condiciones' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: hashedPassword,
      rol,
      aceptaTerminos,
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
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña obligatorios' });
    }

    const usuario = await Usuario.findOne({ email: email.toLowerCase() })
      .select('+password +googleId +sessionToken +requiereCambioPassword +passwordTemporal');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (!usuario.password) {
      return res.status(400).json({
        mensaje: 'Tu cuenta está vinculada a Google. Iniciá sesión con Google o restablecé la contraseña para crear una clave local.'
      });
    }

    // ACTUALIZADO: Permitir login con password temporal
    let coincide = false;
    
    if (usuario.requiereCambioPassword && usuario.passwordTemporal) {
      // Verificar si es la password temporal (sin hash)
      coincide = password === usuario.passwordTemporal;
    }
    
    // Si no coincide con temporal, verificar con hash normal
    if (!coincide) {
      coincide = await bcrypt.compare(password, usuario.password);
    }

    if (!coincide) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // NUEVO: Si requiere cambio de contraseña, retornar estado especial
    if (usuario.requiereCambioPassword) {
      return res.status(200).json({ // Cambiado de 403 a 200
        mensaje: 'Debes cambiar tu contraseña temporal',
        requiereCambioPassword: true,
        email: usuario.email
      });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');

    usuario.sessionToken = sessionToken;
    usuario.lastSessionDate = new Date();
    await usuario.save();

    await usuario.populate({ path: 'planPersonalizado', select: '_id titulo tipo' });

    const payload = {
      id: usuario._id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      planPersonalizado: usuario.planPersonalizado || null,
      sessionToken,
      pagoManual: usuario.pagoManual || false
    };

    const tokenDuration = rememberMe ? '30d' : '8h';
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: tokenDuration });

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: payload,
      tokenDuration: rememberMe ? 'long' : 'short'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// NUEVO: Activar/desactivar pago manual
const togglePagoManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { pagoManual } = req.body;

    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ mensaje: 'Solo administradores pueden modificar pagos manuales' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      id,
      { pagoManual: !!pagoManual },
      { new: true }
    ).select('-password');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: `Pago manual ${pagoManual ? 'activado' : 'desactivado'} correctamente`,
      usuario
    });
  } catch (error) {
    console.error('Error al actualizar pago manual:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// v2: Ahora se usa solo para planificaciones personalizadas
const asignarPlanificacion = async (req, res) => {
  const { idUsuario, idPlan } = req.params;

  try {
    const usuario = await Usuario.findById(idUsuario);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Valido existencia de planificación
    const planificacion = await Planificacion.findById(idPlan);
    if (!planificacion) return res.status(404).json({ mensaje: 'Planificación no encontrada' });

    // Valido que sea una planificación de categoría personalizada
    if (planificacion.categoria !== 'personalizada') {
      return res.status(400).json({ mensaje: 'Solo se puede asignar una planificación personalizada' });
    }
    usuario.planPersonalizado = idPlan;
    planificacion.usuarioAsignado = idUsuario; // Actualizo referencia en planificación

    await planificacion.save();
    await usuario.save();

    res.json({ mensaje: 'Planificación personalizada asignada correctamente' });
  } catch (error) {
    console.error('Error en asignar Planificacion:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};


const obtenerPerfil = async (req, res) => {
  try {
    // ACTUALIZADO: Agregar populate de subscription
    const usuario = await Usuario.findById(req.usuario.id)
      .select('-password -__v')
      .populate({
        path: 'planPersonalizado',
        select: '_id titulo tipo'
      })
      .populate('subscription') // NUEVO: Popular subscription para que funcione el virtual
      .lean({ virtuals: true }); // Incluyo campos virtuales como estadoPago

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
        estadoPago: usuario.estadoPago,
      },
      planificacion: usuario.planPersonalizado ? {
        id: usuario.planPersonalizado._id,
        titulo: usuario.planPersonalizado.titulo,
        tipo: usuario.planPersonalizado.tipo
      } : null,
      subscription: usuario.subscription ? { // NUEVO: Info de suscripción
        plan: usuario.subscription.plan,
        estado: usuario.subscription.estado,
        currentPeriodEnd: usuario.subscription.currentPeriodEnd
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
    const { rol, estadoPago, search, nombre, email, id } = req.query;
    const query = {};

    // Filtros individuales
    if (rol) query.rol = rol;
    if (estadoPago) query.estadoPago = estadoPago;
    if (nombre) query.nombre = { $regex: nombre, $options: 'i' }; // Búsqueda exacta por nombre
    if (email) query.email = { $regex: email, $options: 'i' }; // Búsqueda exacta por email
    if (id) query._id = id; // Búsqueda por ID

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

const cambiarRolUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body;

    // Preventivo: paso a minúsculas el rol
    const rolNormalizado = nuevoRol.toLowerCase();

    // Validaciones
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    if (usuario.rol === rolNormalizado) {
      return res.status(400).json({ mensaje: 'El usuario ya tiene este rol' });
    }
    if (!['admin', 'coach', 'cliente'].includes(rolNormalizado)) {
      return res.status(400).json({ mensaje: 'Rol inválido' });
    }
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      { rol: rolNormalizado },
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
      mensaje: 'Rol actualizado correctamente',
      usuario: usuarioActualizado
    });

  } catch (error) {
    console.error('Error al cambiar rol:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// Obtener plan requests de usuarios (coach y admin)
const obtenerPlanRequestsUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ mensaje: 'ID de usuario es obligatorio' });
    }

    const usuario = await Usuario.findById(id).lean();
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    const planRequest = await PlanRequest.findById(usuario.planRequest).lean();
    if (!planRequest) {
      return res.status(404).json({ mensaje: 'Plan request no encontrado para este usuario' });
    }

    res.json({ mensaje: 'Plan requests obtenidos correctamente', planRequest: planRequest });
  } catch (error) {
    console.error('Error al obtener plan requests:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
}

const logoutUsuario = async (req, res) => {
  try {
    const { id } = req.usuario;

    // Invalida el sessionToken en BD
    await Usuario.findByIdAndUpdate(id, {
      sessionToken: null,
      lastSessionDate: new Date()
    });

    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// NUEVO: Crear usuario restringido (solo admin)
const crearUsuarioReservas = async (req, res) => {
  try {
    const { nombre, email } = req.body;

    // Validar que quien crea es admin
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ mensaje: 'Solo administradores pueden crear usuarios de reservas' });
    }

    // Validaciones
    if (!nombre || !email) {
      return res.status(400).json({ mensaje: 'Nombre y email son requeridos' });
    }

    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'Ya existe un usuario con ese email' });
    }

    // Generar contraseña temporal
    const passwordTemporal = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres

    const nuevoUsuario = new Usuario({
      nombre,
      email: email.toLowerCase(),
      password: passwordTemporal,
      rol: 'reservas',
      pagoManual: true,
      creadoPorAdmin: true,
      requiereCambioPassword: true,
      passwordTemporal: passwordTemporal,
      aceptaTerminos: true, // Auto-aceptados por el admin
      authProvider: 'local'
    });

    await nuevoUsuario.save();

    res.status(201).json({
      mensaje: 'Usuario de reservas creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        passwordTemporal: passwordTemporal // Enviar al admin para que lo comparta
      }
    });
  } catch (error) {
    console.error('Error al crear usuario de reservas:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

// NUEVO: Cambiar contraseña inicial
const cambiarPasswordInicial = async (req, res) => {
  try {
    const { email, passwordTemporal, nuevaPassword } = req.body;

    if (!email || !passwordTemporal || !nuevaPassword) {
      return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
    }

    if (nuevaPassword.length < 8) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({ email: email.toLowerCase() })
      .select('+password +passwordTemporal');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (!usuario.requiereCambioPassword) {
      return res.status(400).json({ mensaje: 'Este usuario no requiere cambio de contraseña' });
    }

    // Verificar password temporal
    if (usuario.passwordTemporal !== passwordTemporal) {
      return res.status(401).json({ mensaje: 'Contraseña temporal incorrecta' });
    }

    // Actualizar contraseña
    usuario.password = nuevaPassword;
    usuario.requiereCambioPassword = false;
    usuario.passwordTemporal = null;
    await usuario.save();

    res.json({ mensaje: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  logoutUsuario,
  asignarPlanificacion,
  obtenerPerfil,
  obtenerUsuarios,
  cambiarRolUsuario,
  obtenerPlanRequestsUsuario,
  crearUsuarioReservas,
  cambiarPasswordInicial,
  togglePagoManual
};

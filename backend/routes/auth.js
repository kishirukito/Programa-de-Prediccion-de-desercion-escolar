import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pag_alumnos_secret_2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos.' });
  if (!supabase)
    return res.status(503).json({ success: false, message: 'Servicio de base de datos no disponible.' });

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas. Verifica tu correo y contraseña.',
      });
    }

    const authUser = authData.user;

    let perfil = { nombre: '', apellidos: '', rol: 'admin', activo: true };
    try {
      const { data: perfilData } = await supabase
        .from('usuarios')
        .select('nombre, apellidos, rol, activo')
        .eq('email', email)
        .single();
      if (perfilData) perfil = { ...perfil, ...perfilData };
    } catch (_) {
      perfil.nombre   = authUser.user_metadata?.nombre   || authUser.email.split('@')[0];
      perfil.apellidos = authUser.user_metadata?.apellidos || '';
      perfil.rol      = authUser.user_metadata?.rol       || 'admin';
    }

    if (perfil.activo === false)
      return res.status(403).json({ success: false, message: 'Usuario desactivado. Contacta al administrador.' });

    const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`.trim() || authUser.email;
    const token = jwt.sign(
      { id: authUser.id, nombre: nombreCompleto, rol: perfil.rol, email: authUser.email },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      success: true,
      token,
      user: { id: authUser.id, name: nombreCompleto, role: perfil.rol, email: authUser.email },
    });
  } catch (e) {
    console.error('[AUTH] Error en login:', e.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;

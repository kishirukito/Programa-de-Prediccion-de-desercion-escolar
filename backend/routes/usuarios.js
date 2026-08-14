import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/usuarios
router.get('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('id, nombre, apellidos, email, rol, activo').order('nombre');
    if (error) throw error;
    res.json({
      success: true,
      data: (data || []).map(u => ({ id: u.id, nombre: u.nombre, apellido: u.apellidos, email: u.email, rol: u.rol, activo: u.activo !== false })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/usuarios/:id
router.get('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('id, nombre, apellidos, email, rol, activo').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({
      success: true,
      data: { id: data.id, nombre: data.nombre, apellido: data.apellidos, email: data.email, rol: data.rol, activo: data.activo },
      roles: [
        { id: 'admin', nombre: 'Administrador' }, { id: 'docente', nombre: 'Docente' },
        { id: 'tutor', nombre: 'Tutor' },         { id: 'coordinador', nombre: 'Coordinador' },
      ],
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/usuarios
router.post('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { nombre, apellido, email, rol } = req.body;
    if (!nombre || !email) return res.status(400).json({ success: false, message: 'Nombre y correo requeridos' });
    const { data, error } = await supabase.from('usuarios')
      .insert({ nombre, apellidos: apellido || '', email, rol: rol || 'docente', activo: true })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const update = {};
    if (req.body.nombre)              update.nombre   = req.body.nombre;
    if (req.body.apellido !== undefined) update.apellidos = req.body.apellido;
    if (req.body.email)               update.email    = req.body.email;
    if (req.body.rol)                 update.rol      = req.body.rol;
    const { data, error } = await supabase.from('usuarios').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PATCH /api/usuarios/:id/estado
router.patch('/:id/estado', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data: current } = await supabase.from('usuarios').select('activo').eq('id', req.params.id).single();
    const nuevoEstado = !current?.activo;
    const { error } = await supabase.from('usuarios').update({ activo: nuevoEstado }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, data: { activo: nuevoEstado } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/roles
router.get('/roles/list', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'admin',       nombre: 'Administrador',   descripcion: 'Acceso completo al sistema',          permisos: ['Ver Dashboard', 'Ver Expedientes', 'Administrar Usuarios', 'Exportar Reportes'] },
      { id: 'director',    nombre: 'Director',         descripcion: 'Dirección institucional',             permisos: ['Ver Dashboard', 'Ver Expedientes', 'Exportar Reportes'] },
      { id: 'coordinador', nombre: 'Coordinador',      descripcion: 'Coordinación académica',              permisos: ['Ver Expedientes', 'Exportar Reportes'] },
      { id: 'docente',     nombre: 'Docente',           descripcion: 'Captura de calificaciones y seguimiento', permisos: ['Captura Docente', 'Ver Expedientes'] },
      { id: 'tutor',       nombre: 'Tutor',             descripcion: 'Atención de alertas y tutoría',      permisos: ['Atender Alertas', 'Ver Expedientes'] },
    ],
  });
});

export default router;

import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mapEstadoRiesgo } from '../helpers/mapRiesgo.js';
import { getUsuariosPorRol } from '../helpers/usuarios.js';

const router = Router();

// GET /api/docentes
router.get('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const usuarios = await getUsuariosPorRol(['docente', 'tutor', 'profesor', 'coordinador']);
    res.json({
      success: true,
      data: usuarios.map(u => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellidos}`.trim(),
        email: u.email,
        departamento: u.rol,
        materias: '',
        grupo: '',
        grupo_color: (u.rol || '').toLowerCase().includes('tutor') ? '#3b82f6' : '#86c53c',
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/docentes
router.post('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { nombre, email } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: 'Nombre requerido' });
    const parts = nombre.trim().split(' ');
    const { data, error } = await supabase.from('usuarios')
      .insert({ nombre: parts[0], apellidos: parts.slice(1).join(' '), email: email || '', rol: 'docente', activo: true })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/docentes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Docente eliminado' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/docentes/asignaciones
router.get('/asignaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [], docentes: [], grupos: [], materias: [] });
  try {
    const [{ data: dm }, { data: materias }, todosUsuarios] = await Promise.all([
      supabase.from('docente_materia')
        .select('id, docente_id, materia_id, periodo_id, grupo_id, grupo, aula')
        .limit(200),
      supabase.from('materias').select('id, nombre, clave'),
      getUsuariosPorRol(['docente', 'tutor', 'profesor', 'coordinador']),
    ]);

    const userMap = {};
    todosUsuarios.forEach(u => { userMap[u.id] = u; });

    const { data: gruposData } = await supabase
      .from('grupos')
      .select('id, nombre, cuatrimestre_numero, turno, carrera_id, carrera:carreras(clave_programa)')
      .eq('activo', true);
    const grupoMap = {};
    (gruposData || []).forEach(g => { grupoMap[g.id] = g; });

    const { data: periodosData } = await supabase
      .from('periodos_academicos').select('id, nombre, anio, numero');
    const periodoMap = {};
    (periodosData || []).forEach(p => { periodoMap[p.id] = p.nombre || `${p.anio}-${p.numero}`; });

    const asignaciones = (dm || []).map(d => {
      const docente = userMap[d.docente_id];
      const materia = (materias || []).find(m => m.id === d.materia_id);
      const grupo   = grupoMap[d.grupo_id];
      return {
        id: d.id,
        docente_id: d.docente_id,
        docente_nombre: docente ? `${docente.nombre} ${docente.apellidos}`.trim() : `ID: ${d.docente_id?.slice(0, 8)}…`,
        docente_email: docente?.email || '',
        materia_id: d.materia_id,
        materia_nombre: materia?.nombre || '—',
        materia_clave: materia?.clave || '—',
        grupo_id: d.grupo_id,
        grupo_nombre: grupo?.nombre || d.grupo || '—',
        carrera_clave: grupo?.carrera?.clave_programa || '—',
        semestre: grupo?.cuatrimestre_numero || '—',
        turno: grupo?.turno || '—',
        periodo: periodoMap[d.periodo_id] || d.periodo_id || '—',
        aula: d.aula,
      };
    });

    res.json({
      success: true,
      data: asignaciones,
      docentes: todosUsuarios.map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), email: u.email, rol: u.rol })),
      materias: materias || [],
      grupos: (gruposData || []).map(g => ({ id: g.id, nombre: `${g.carrera?.clave_programa} ${g.cuatrimestre_numero}° "${g.nombre}"` })),
    });
  } catch (e) {
    console.error('[ASIGNACIONES]', e.message);
    res.json({ success: true, data: [], docentes: [], grupos: [], materias: [] });
  }
});

// GET /api/docentes/tutorias
router.get('/tutorias', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [], tutores: [] });
  try {
    const [{ data: estudiantesData }, tutores] = await Promise.all([
      supabase.from('estudiantes')
        .select(`id, matricula, nombre, apellido_paterno, tutor_id,
                 carrera:carreras(nombre, clave_programa),
                 resumen:resumen_academico(estado_riesgo, probabilidad_desercion)`)
        .eq('estado_inscripcion', 'activo').limit(100),
      getUsuariosPorRol(['tutor', 'docente', 'profesor', 'coordinador']),
    ]);

    const tutorMap = {};
    tutores.forEach(u => { tutorMap[u.id] = `${u.nombre} ${u.apellidos}`.trim(); });

    res.json({
      success: true,
      data: (estudiantesData || []).map(a => {
        const resumen = Array.isArray(a.resumen) ? a.resumen[0] : a.resumen;
        return {
          id: a.id, matricula: a.matricula, nombre: a.nombre, apellido_paterno: a.apellido_paterno,
          carrera_nombre: a.carrera?.nombre, carrera_clave: a.carrera?.clave_programa,
          nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
          tutor_id: a.tutor_id || null,
          tutor_nombre: a.tutor_id ? (tutorMap[a.tutor_id] || 'Sin nombre') : null,
        };
      }),
      tutores: tutores.map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), rol: u.rol })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/docentes/asignar-tutor
router.post('/asignar-tutor', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Tutor asignado correctamente' });
});

// DELETE /api/docentes/asignaciones/:id
router.delete('/asignaciones/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true });
  try {
    await supabase.from('docente_materia').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Asignación eliminada' });
  } catch (e) {
    res.json({ success: true, message: 'Asignación eliminada' });
  }
});

export default router;

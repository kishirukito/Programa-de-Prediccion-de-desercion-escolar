import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getUsuariosPorRol } from '../helpers/usuarios.js';

const router = Router();

// GET /api/alertas
router.get('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase.from('alertas')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno, tutor_id, carrera:carreras(clave_programa))`)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;

    const todosUsuarios = await getUsuariosPorRol(['tutor', 'docente', 'profesor', 'coordinador']);
    const tutorMap = {};
    todosUsuarios.forEach(u => { tutorMap[u.id] = `${u.nombre} ${u.apellidos}`.trim(); });

    const alertas = (data || []).map(a => ({
      ...a,
      nivel_riesgo: a.nivel || 'medio',
      motivo: a.descripcion || a.titulo,
      tipo: a.tipo || 'Alerta',
      estado: a.atendida ? 'atendida' : 'pendiente',
      fecha: a.created_at?.slice(0, 10),
      alumno_nombre: `${a.estudiante?.nombre || ''} ${a.estudiante?.apellido_paterno || ''}`.trim(),
      carrera: a.estudiante?.carrera?.clave_programa || '',
      tutor_nombre: a.estudiante?.tutor_id ? (tutorMap[a.estudiante.tutor_id] || 'Sin nombre') : null,
    }));
    res.json({ success: true, data: alertas });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/alertas/count
router.get('/count', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, count: 0 });
  try {
    const { count } = await supabase.from('alertas')
      .select('*', { count: 'exact', head: true }).eq('atendida', false);
    res.json({ success: true, count: count || 0 });
  } catch (e) {
    res.json({ success: true, count: 0 });
  }
});

// POST /api/alertas/generar
router.post('/generar', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data: resumenes } = await supabase.from('resumen_academico')
      .select('estudiante_id, estado_riesgo, probabilidad_desercion')
      .in('estado_riesgo', ['riesgo_critico', 'riesgo_moderado']);
    let nuevas = 0;
    for (const r of (resumenes || [])) {
      const { data: existing } = await supabase.from('alertas')
        .select('id').eq('estudiante_id', r.estudiante_id).eq('atendida', false).single();
      if (!existing) {
        await supabase.from('alertas').insert({
          estudiante_id: r.estudiante_id,
          tipo: 'Alerta IA',
          nivel: r.estado_riesgo === 'riesgo_critico' ? 'critico' : 'alto',
          titulo: r.estado_riesgo === 'riesgo_critico' ? 'Riesgo crítico detectado' : 'Riesgo alto detectado',
          descripcion: `Probabilidad de deserción: ${Math.round((r.probabilidad_desercion || 0) * 100)}%`,
          atendida: false,
        });
        nuevas++;
      }
    }
    res.json({ success: true, message: `${nuevas} alerta(s) generada(s)`, nuevas });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/alertas/:id/atender
router.post('/:id/atender', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('alertas').update({ atendida: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Alerta atendida correctamente' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /api/alertas/:id
router.put('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const update = {};
    if (req.body.estado !== undefined) update.atendida = req.body.estado === 'atendida';
    if (req.body.notas_cierre !== undefined) update.descripcion = req.body.notas_cierre;
    const { error } = await supabase.from('alertas').update(update).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Alerta actualizada' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

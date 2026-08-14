import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/catalogos/carreras
router.get('/carreras', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  const { data, error } = await supabase.from('carreras')
    .select('id, nombre, clave_programa').order('nombre');
  res.json({ success: !error, data: data || [] });
});

// GET /api/catalogos/grupos
router.get('/grupos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { periodo_id } = req.query;
    let query = supabase
      .from('grupos')
      .select('id, nombre, cuatrimestre_numero, turno, carrera_id, periodo_id, carrera:carreras(nombre, clave_programa)')
      .eq('activo', true)
      .order('cuatrimestre_numero');
    if (periodo_id) query = query.eq('periodo_id', periodo_id);
    const { data, error } = await query;
    const mapped = (data || []).map(g => ({
      id: g.id, nombre: g.nombre, semestre: g.cuatrimestre_numero,
      turno: g.turno, carrera_id: g.carrera_id, periodo_id: g.periodo_id,
      carrera_nombre: g.carrera?.nombre || '',
      carrera_clave: g.carrera?.clave_programa || '',
    }));
    res.json({ success: !error, data: mapped });
  } catch (e) {
    res.json({ success: false, data: [] });
  }
});

// GET /api/catalogos/materias
router.get('/materias', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  const { data, error } = await supabase.from('materias')
    .select('id, nombre, clave, creditos').order('nombre');
  res.json({ success: !error, data: data || [] });
});

export default router;

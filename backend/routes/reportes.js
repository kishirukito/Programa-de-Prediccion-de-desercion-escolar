import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mapEstadoRiesgo } from '../helpers/mapRiesgo.js';

const router = Router();

// GET /api/reportes/datos
router.get('/datos', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data: resumen } = await supabase.from('resumen_academico')
      .select('estado_riesgo, probabilidad_desercion, estudiante:estudiantes(matricula, nombre, apellido_paterno)');
    const riesgo = { critico: 0, alto: 0, medio: 0, bajo: 0 };
    (resumen || []).forEach(r => { const n = mapEstadoRiesgo(r.estado_riesgo); if (riesgo[n] !== undefined) riesgo[n]++; });
    const { count: total }     = await supabase.from('estudiantes').select('*', { count: 'exact', head: true }).eq('estado_inscripcion', 'activo');
    const { count: atendidas } = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('atendida', true);
    const { count: pendientes} = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('atendida', false);
    res.json({
      success: true,
      data: {
        total_alumnos: total || 0, riesgo,
        alumnos: (resumen || []).map(r => ({
          matricula: r.estudiante?.matricula,
          nombre: `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
          nivel_riesgo: mapEstadoRiesgo(r.estado_riesgo),
        })),
        alertas_atendidas: atendidas || 0, alertas_pendientes: pendientes || 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/reportes/preview
router.get('/preview', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { tipo, nivel, estado } = req.query;
    let titulo = '', columnas = [], data = [];

    if (tipo === 'riesgo') {
      titulo   = 'Estudiantes en Riesgo';
      columnas = ['Matrícula', 'Alumno', 'Carrera', 'Cuatrimestre', 'Promedio', 'Asistencia %', 'Mat. Reprob.', 'Nivel Riesgo'];
      let q = supabase.from('resumen_academico').select(`promedio_actual, asistencia_promedio, materias_reprobadas, cuatrimestre_actual, estado_riesgo,
        estudiante:estudiantes(matricula, nombre, apellido_paterno, carrera:carreras(clave_programa))`).limit(200);
      if (nivel) { const m = { critico: 'riesgo_critico', alto: 'riesgo_moderado', medio: 'alerta_temprana', bajo: 'estable' }; if (m[nivel]) q = q.eq('estado_riesgo', m[nivel]); }
      const { data: rows } = await q;
      const nivelLabel = { riesgo_critico: 'Crítico', riesgo_moderado: 'Alto', alerta_temprana: 'Medio', estable: 'Bajo' };
      data = (rows || []).map(r => [
        r.estudiante?.matricula,
        `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        r.estudiante?.carrera?.clave_programa || '', r.cuatrimestre_actual,
        r.promedio_actual ?? 'N/A',
        r.asistencia_promedio != null ? `${r.asistencia_promedio}%` : 'N/A',
        r.materias_reprobadas ?? 0,
        nivelLabel[r.estado_riesgo] || 'Sin datos',
      ]);
    } else if (tipo === 'alertas') {
      titulo   = 'Alertas de Retención';
      columnas = ['Alumno', 'Tipo', 'Descripción', 'Nivel', 'Estado', 'Fecha'];
      let q = supabase.from('alertas').select(`tipo, nivel, titulo, descripcion, atendida, created_at,
        estudiante:estudiantes(nombre, apellido_paterno)`).order('created_at', { ascending: false }).limit(200);
      if (estado === 'pendiente') q = q.eq('atendida', false);
      else if (estado === 'atendida') q = q.eq('atendida', true);
      const { data: rows } = await q;
      data = (rows || []).map(a => [
        `${a.estudiante?.nombre || ''} ${a.estudiante?.apellido_paterno || ''}`.trim(),
        a.tipo || 'Alerta', a.descripcion || a.titulo, a.nivel || '',
        a.atendida ? 'Atendida' : 'Pendiente', a.created_at?.slice(0, 10),
      ]);
    } else if (tipo === 'indicadores') {
      titulo   = 'Indicadores Académicos';
      columnas = ['Matrícula', 'Alumno', 'Promedio Actual', 'Asistencia %', 'Mat. Reprob.', 'Mat. Recursadas', 'Cuatrimestre'];
      const { data: rows } = await supabase.from('resumen_academico').select(`promedio_actual, asistencia_promedio,
        materias_reprobadas, materias_recursadas, cuatrimestre_actual,
        estudiante:estudiantes(matricula, nombre, apellido_paterno)`).limit(200);
      data = (rows || []).map(r => [
        r.estudiante?.matricula,
        `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        r.promedio_actual ?? 'N/A',
        r.asistencia_promedio != null ? `${r.asistencia_promedio}%` : 'N/A',
        r.materias_reprobadas ?? 0, r.materias_recursadas ?? 0, r.cuatrimestre_actual,
      ]);
    } else if (tipo === 'seguimiento') {
      titulo   = 'Seguimiento de Estudiantes';
      columnas = ['Alumno', 'Nivel Riesgo', 'Promedio', 'Asistencia', 'Estado'];
      const { data: rows } = await supabase.from('resumen_academico').select(`promedio_actual, asistencia_promedio, estado_riesgo,
        estudiante:estudiantes(nombre, apellido_paterno, estado_inscripcion)`).limit(200);
      data = (rows || []).map(r => [
        `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        mapEstadoRiesgo(r.estado_riesgo), r.promedio_actual ?? 'N/A',
        r.asistencia_promedio != null ? `${r.asistencia_promedio}%` : 'N/A',
        r.estudiante?.estado_inscripcion || 'activo',
      ]);
    }

    res.json({ success: true, titulo, columnas, data, total: data.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/reportes  →  alias hacia preview
router.get('/', requireAuth, (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  res.redirect(307, `/api/reportes/preview${qs ? '?' + qs : ''}`);
});

export default router;

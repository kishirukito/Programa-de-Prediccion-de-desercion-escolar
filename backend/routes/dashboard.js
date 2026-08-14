import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mapEstadoRiesgo } from '../helpers/mapRiesgo.js';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { periodo } = req.query;

    const { data: estudiantesData } = await supabase
      .from('estudiantes').select('id').eq('estado_inscripcion', 'activo');
    const totalEstudiantes = estudiantesData?.length || 0;

    let resumenQuery = supabase.from('resumen_academico')
      .select('estado_riesgo, promedio_actual, asistencia_promedio, materias_reprobadas, parciales_reprobados, estudiante_id, periodo_id');
    if (periodo) resumenQuery = resumenQuery.eq('periodo_id', periodo);
    const { data: resumenData } = await resumenQuery;

    const riesgo = { critico: 0, alto: 0, medio: 0, bajo: 0, sin_datos: 0 };
    (resumenData || []).forEach(r => {
      const nivel = mapEstadoRiesgo(r.estado_riesgo);
      riesgo[nivel] = (riesgo[nivel] || 0) + 1;
    });
    const sinDatos = totalEstudiantes - (resumenData?.length || 0);
    if (sinDatos > 0) riesgo.sin_datos += sinDatos;

    const { data: alertasData } = await supabase.from('alertas').select('id').eq('atendida', false);
    const alertasPendientes = alertasData?.length || 0;

    const totalRes   = resumenData?.length || 0;
    const sumaAsist  = (resumenData || []).reduce((s, r) => s + (parseFloat(r.asistencia_promedio) || 0), 0);
    const promedioAsistencia = totalRes > 0 ? Math.round((sumaAsist / totalRes) * 10) / 10 : 0;

    const { data: calsData } = await supabase.from('calificaciones').select('parcial_1, parcial_2, parcial_3');
    const evolucion = [1, 2, 3].map(p => {
      const campo = `parcial_${p}`;
      const vals  = (calsData || []).map(c => c[campo]).filter(v => v !== null && v !== undefined);
      const promedio   = vals.length ? Math.round(vals.reduce((s, v) => s + parseFloat(v), 0) / vals.length * 10) / 10 : null;
      const aprobados  = vals.filter(v => parseFloat(v) >= 7).length;
      const reprobados = vals.filter(v => parseFloat(v) < 7).length;
      return { parcial: p, promedio_general: promedio, aprobados, reprobados, total_alumnos: vals.length };
    });

    const { data: carrerasData } = await supabase.from('carreras').select('id, nombre, clave_programa');
    const { data: gruposData }   = await supabase.from('grupos').select('id, nombre, cuatrimestre_numero, turno, carrera_id').eq('activo', true);
    const { data: periodosData } = await supabase.from('periodos_academicos')
      .select('id, nombre, anio, numero').order('anio', { ascending: false }).limit(10);

    const { data: riesgoReciente } = await supabase
      .from('resumen_academico')
      .select(`estudiante_id, estado_riesgo, probabilidad_desercion, promedio_actual, asistencia_promedio, materias_reprobadas,
               estudiante:estudiantes(matricula, nombre, apellido_paterno, carrera:carreras(clave_programa))`)
      .in('estado_riesgo', ['riesgo_critico', 'riesgo_moderado'])
      .order('probabilidad_desercion', { ascending: false })
      .limit(5);

    const alumnosRiesgoRecientes = (riesgoReciente || []).map(r => ({
      id: r.estudiante_id,
      matricula: r.estudiante?.matricula,
      nombre: r.estudiante?.nombre,
      apellido_paterno: r.estudiante?.apellido_paterno,
      nivel_riesgo: mapEstadoRiesgo(r.estado_riesgo),
      promedio_general: r.promedio_actual,
      porcentaje_asistencia: r.asistencia_promedio,
      materias_reprobadas: r.materias_reprobadas,
      carrera_clave: r.estudiante?.carrera?.clave_programa,
    }));

    res.json({
      success: true,
      data: {
        total_estudiantes: totalEstudiantes,
        alertas_pendientes: alertasPendientes,
        promedio_asistencia: promedioAsistencia,
        riesgo,
        evolucion_rendimiento: evolucion,
        materias_reprobacion: [],
        alumnos_riesgo_recientes: alumnosRiesgoRecientes,
      },
      filtros: {
        carreras: carrerasData || [],
        grupos: (gruposData || []).map(g => ({ id: g.id, nombre: g.nombre, carrera_id: g.carrera_id })),
        periodos: (periodosData || []).map(p => ({ id: p.id, nombre: p.nombre || `${p.anio}-${p.numero}` })),
        periodo_actual: periodo || periodosData?.[0]?.id || '',
      },
    });
  } catch (e) {
    console.error('[DASHBOARD]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

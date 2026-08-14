import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mapEstadoRiesgo } from '../helpers/mapRiesgo.js';

const router = Router();

// GET /api/expedientes
router.get('/', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { carrera_id, riesgo, grupo_id } = req.query;
    const rol = (req.user?.rol || '').toLowerCase();
    const esDocente = rol.includes('docente') || rol.includes('profesor');

    // Si es docente, restringir a sus grupos aunque no se haya pasado grupo_id
    let estudianteIdsGrupo = null;

    if (grupo_id) {
      // Filtro explícito por grupo (cualquier rol)
      const { data: inscripciones } = await supabase
        .from('inscripciones_periodo')
        .select('estudiante_id')
        .eq('grupo_id', grupo_id);
      estudianteIdsGrupo = (inscripciones || []).map(i => i.estudiante_id);
    } else if (esDocente) {
      // Docente sin filtro explícito → solo sus grupos
      const { data: asignaciones } = await supabase
        .from('docente_materia')
        .select('grupo_id')
        .eq('docente_id', req.user.id)
        .not('grupo_id', 'is', null);
      const grupoIds = [...new Set((asignaciones || []).map(a => a.grupo_id).filter(Boolean))];
      if (grupoIds.length === 0) return res.json({ success: true, data: [], carreras: [], grupos: [] });

      const { data: inscripciones } = await supabase
        .from('inscripciones_periodo')
        .select('estudiante_id')
        .in('grupo_id', grupoIds);
      estudianteIdsGrupo = [...new Set((inscripciones || []).map(i => i.estudiante_id))];
    }

    let query = supabase.from('estudiantes').select(`
      id, matricula, nombre, apellido_paterno, apellido_materno,
      estado_inscripcion, turno, trabaja, foraneo,
      carrera:carreras(id, nombre, clave_programa),
      resumen:resumen_academico(periodo_id, promedio_actual, promedio_general, asistencia_promedio,
        materias_reprobadas, materias_recursadas, parciales_reprobados,
        cuatrimestre_actual, probabilidad_desercion, estado_riesgo)
    `).eq('estado_inscripcion', 'activo').limit(200);

    if (carrera_id) query = query.eq('carrera_id', carrera_id);
    if (estudianteIdsGrupo) {
      if (estudianteIdsGrupo.length === 0)
        return res.json({ success: true, data: [], carreras: [], grupos: [] });
      query = query.in('id', estudianteIdsGrupo);
    }

    const { data, error } = await query;
    if (error) throw error;

    let alumnos = (data || []).map(a => {
      const resumenes = Array.isArray(a.resumen) ? a.resumen : (a.resumen ? [a.resumen] : []);
      const resumen   = resumenes
        .filter(r => r.promedio_actual > 0 || r.asistencia_promedio > 0 || r.materias_reprobadas > 0)
        .sort((x, y) => new Date(y.updated_at || 0) - new Date(x.updated_at || 0))[0]
        || resumenes.sort((x, y) => new Date(y.updated_at || 0) - new Date(x.updated_at || 0))[0];
      return {
        id: a.id, matricula: a.matricula, nombre: a.nombre,
        apellido_paterno: a.apellido_paterno, apellido_materno: a.apellido_materno,
        estado: a.estado_inscripcion, turno: a.turno, trabaja: a.trabaja, foraneo: a.foraneo,
        carrera_id: a.carrera?.id, carrera_nombre: a.carrera?.nombre, carrera_clave: a.carrera?.clave_programa,
        semestre: resumen?.cuatrimestre_actual,
        periodo_id: resumen?.periodo_id || null,
        promedio_general: resumen?.promedio_actual ?? resumen?.promedio_general,
        porcentaje_asistencia: resumen?.asistencia_promedio,
        materias_reprobadas: resumen?.materias_reprobadas,
        materias_recursadas: resumen?.materias_recursadas,
        parciales_reprobados: resumen?.parciales_reprobados,
        probabilidad_desercion: resumen?.probabilidad_desercion,
        nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
      };
    });

    if (riesgo && riesgo !== 'todos') alumnos = alumnos.filter(a => a.nivel_riesgo === riesgo);

    const [{ data: carrerasData }, { data: gruposData }] = await Promise.all([
      supabase.from('carreras').select('id, nombre, clave_programa'),
      supabase.from('grupos')
        .select('id, nombre, cuatrimestre_numero, carrera_id, carrera:carreras(clave_programa)')
        .eq('activo', true).order('cuatrimestre_numero'),
    ]);

    res.json({
      success: true,
      data: alumnos,
      carreras: (carrerasData || []).map(c => ({
        id: c.id, nombre: c.nombre,
        clave: c.clave_programa,
        clave_programa: c.clave_programa,
      })),
      grupos: (gruposData || []).map(g => ({
        id: g.id, nombre: g.nombre,
        semestre: g.cuatrimestre_numero,
        carrera_clave: g.carrera?.clave_programa || '',
        carrera_id: g.carrera_id,
      })),
    });
  } catch (e) {
    console.error('[EXPEDIENTES]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/expedientes/:id
router.get('/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase
      .from('estudiantes')
      .select(`*, carrera:carreras(nombre, clave_programa),
               resumen:resumen_academico(*),
               calificaciones:calificaciones(materia_id, parcial_1, parcial_2, parcial_3, periodo_id, materia:materias(nombre, clave)),
               alertas:alertas(*)`)
      .eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Alumno no encontrado' });

    const resumenes = Array.isArray(data.resumen) ? data.resumen : (data.resumen ? [data.resumen] : []);
    const resumen   = resumenes
      .filter(r => r.promedio_actual > 0 || r.asistencia_promedio > 0 || r.materias_reprobadas > 0)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]
      || resumenes.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];

    const cals             = data.calificaciones || [];
    const promedioGeneral  = resumen?.promedio_actual || null;
    const materiasReprobadas = resumen?.materias_reprobadas ?? (() => {
      let rep = 0;
      cals.forEach(c => {
        const p = [c.parcial_1, c.parcial_2, c.parcial_3].filter(v => v != null).map(parseFloat);
        if (p.length && p.reduce((s, v) => s + v, 0) / p.length < 7) rep++;
      });
      return rep;
    })();

    const { data: asistsTotales } = await supabase
      .from('asistencias').select('asistio').eq('estudiante_id', req.params.id);
    const totalAsist    = asistsTotales?.length || 0;
    const presentesAll  = (asistsTotales || []).filter(a => a.asistio).length;
    const asistenciaGlobal = totalAsist > 0
      ? Math.round(presentesAll / totalAsist * 1000) / 10
      : (resumen?.asistencia_promedio || null);

    res.json({
      success: true,
      data: {
        ...data,
        carrera_nombre: data.carrera?.nombre,
        carrera_clave: data.carrera?.clave_programa,
        nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
        promedio_general: promedioGeneral,
        porcentaje_asistencia: asistenciaGlobal,
        materias_reprobadas: materiasReprobadas,
        parciales_reprobados: resumen?.parciales_reprobados || 0,
        probabilidad_desercion: resumen?.probabilidad_desercion,
        recursamiento: resumen?.materias_recursadas > 0,
        num_recursamiento: resumen?.materias_recursadas || 0,
        calificacion_p1: resumen?.calificacion_minima_parcial || null,
        calificacion_p2: null,
        calificacion_p3: resumen?.calificacion_maxima_parcial || null,
        asistencia_p1: asistenciaGlobal,
        asistencia_p2: asistenciaGlobal,
        asistencia_p3: asistenciaGlobal,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

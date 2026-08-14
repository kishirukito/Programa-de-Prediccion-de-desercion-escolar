import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mapEstadoRiesgo } from '../helpers/mapRiesgo.js';
import { recalcularResumen } from '../helpers/resumen.js';

const router = Router();

// GET /api/captura/grupos
// Admin/director/coordinador → todos los grupos activos
// Docente → solo los grupos donde tiene materias asignadas
router.get('/grupos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const rol = (req.user?.rol || '').toLowerCase();
    const esDocente = rol.includes('docente') || rol.includes('profesor');

    // Obtener grupo_ids del docente si aplica
    let grupoIdsFiltro = null;
    if (esDocente) {
      const { data: asignaciones } = await supabase
        .from('docente_materia')
        .select('grupo_id')
        .eq('docente_id', req.user.id)
        .not('grupo_id', 'is', null);
      grupoIdsFiltro = [...new Set((asignaciones || []).map(a => a.grupo_id).filter(Boolean))];
      if (grupoIdsFiltro.length === 0) return res.json({ success: true, data: [] });
    }

    let grupoQuery = supabase
      .from('grupos')
      .select('id, nombre, cuatrimestre_numero, turno, carrera_id, periodo_id, carrera:carreras(nombre, clave_programa)')
      .eq('activo', true)
      .order('cuatrimestre_numero');
    if (grupoIdsFiltro) grupoQuery = grupoQuery.in('id', grupoIdsFiltro);

    const { data: grupos, error: gErr } = await grupoQuery;
    if (gErr) throw gErr;

    // Materias asignadas por grupo_id
    // Si es docente: solo sus materias. Si es admin: todas.
    let asigQuery = supabase
      .from('docente_materia')
      .select('grupo_id, materia:materias(id, nombre, clave)')
      .not('grupo_id', 'is', null);
    if (esDocente) asigQuery = asigQuery.eq('docente_id', req.user.id);

    const { data: asigs } = await asigQuery;

    const { data: periodosData } = await supabase
      .from('periodos_academicos')
      .select('id, nombre, fecha_inicio, fecha_fin, anio, numero');
    const periodoMap = {};
    (periodosData || []).forEach(p => { periodoMap[p.id] = p; });

    const materiasPorGrupo = {};
    (asigs || []).forEach(a => {
      if (!a.grupo_id || !a.materia?.id) return;
      if (!materiasPorGrupo[a.grupo_id]) materiasPorGrupo[a.grupo_id] = [];
      if (!materiasPorGrupo[a.grupo_id].some(m => m.id === a.materia.id)) {
        materiasPorGrupo[a.grupo_id].push({ id: a.materia.id, nombre: a.materia.nombre, clave: a.materia.clave });
      }
    });

    const result = (grupos || []).map(g => {
      const periodo = periodoMap[g.periodo_id] || null;
      return {
        id: g.id, nombre: g.nombre, semestre: g.cuatrimestre_numero, turno: g.turno,
        carrera_id: g.carrera_id, periodo_id: g.periodo_id,
        periodo_nombre: periodo?.nombre || '',
        periodo_fecha_inicio: periodo?.fecha_inicio || null,
        periodo_fecha_fin: periodo?.fecha_fin || null,
        carrera_nombre: g.carrera?.nombre || '',
        carrera_clave: g.carrera?.clave_programa || '',
        materias: materiasPorGrupo[g.id] || [],
      };
    });

    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[CAPTURA/GRUPOS]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/captura/asignaciones
router.get('/asignaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { data } = await supabase.from('docente_materia')
      .select('id, periodo_id, grupo, aula, docente:usuarios(nombre, apellidos, email), materia:materias(id, nombre, clave)')
      .limit(200);
    const asignaciones = (data || []).map(d => ({
      id: d.id,
      grupo_nombre: d.grupo || '',
      materia_id: d.materia?.id,
      materia_nombre: d.materia?.nombre,
      materia_clave: d.materia?.clave,
      docente_nombre: `${d.docente?.nombre || ''} ${d.docente?.apellidos || ''}`.trim(),
      periodo: d.periodo_id,
      aula: d.aula,
    }));
    res.json({ success: true, data: asignaciones });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/captura/alumnos
router.get('/alumnos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { grupo_id, carrera_id } = req.query;

    if (grupo_id) {
      const { data: inscripciones, error: iErr } = await supabase
        .from('inscripciones_periodo')
        .select(`cuatrimestre_actual,
          estudiante:estudiantes(
            id, matricula, nombre, apellido_paterno, apellido_materno, carrera_id,
            carrera:carreras(nombre, clave_programa),
            resumen:resumen_academico(promedio_actual, asistencia_promedio, estado_riesgo)
          )`)
        .eq('grupo_id', grupo_id);
      if (iErr) throw iErr;

      const alumnos = (inscripciones || []).map(i => {
        const e = i.estudiante;
        if (!e) return null;
        const resumen = Array.isArray(e.resumen) ? e.resumen[0] : e.resumen;
        return {
          id: e.id, matricula: e.matricula, nombre: e.nombre,
          apellido_paterno: e.apellido_paterno, apellido_materno: e.apellido_materno,
          carrera_id: e.carrera_id,
          carrera_clave: e.carrera?.clave_programa || '',
          carrera_nombre: e.carrera?.nombre || '',
          semestre: i.cuatrimestre_actual,
          promedio_general: resumen?.promedio_actual ?? null,
          porcentaje_asistencia: resumen?.asistencia_promedio ?? null,
          nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
        };
      }).filter(Boolean);

      return res.json({ success: true, data: alumnos });
    }

    let query = supabase.from('estudiantes')
      .select(`id, matricula, nombre, apellido_paterno, apellido_materno, carrera_id,
               carrera:carreras(nombre, clave_programa),
               resumen:resumen_academico(promedio_actual, asistencia_promedio, estado_riesgo)`)
      .eq('estado_inscripcion', 'activo').limit(100);
    if (carrera_id) query = query.eq('carrera_id', carrera_id);
    const { data, error } = await query;
    if (error) throw error;

    const alumnos = (data || []).map(e => {
      const resumen = Array.isArray(e.resumen) ? e.resumen[0] : e.resumen;
      return {
        id: e.id, matricula: e.matricula, nombre: e.nombre,
        apellido_paterno: e.apellido_paterno, apellido_materno: e.apellido_materno,
        carrera_id: e.carrera_id,
        carrera_clave: e.carrera?.clave_programa || '',
        carrera_nombre: e.carrera?.nombre || '',
        promedio_general: resumen?.promedio_actual ?? null,
        porcentaje_asistencia: resumen?.asistencia_promedio ?? null,
        nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
      };
    });
    res.json({ success: true, data: alumnos });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/captura/calificaciones
router.get('/calificaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { materia_id, estudiante_id, periodo_id } = req.query;
    let query = supabase.from('calificaciones')
      .select('estudiante_id, parcial_1, parcial_2, parcial_3, calificacion_final')
      .limit(500);
    if (materia_id)    query = query.eq('materia_id', materia_id);
    if (periodo_id)    query = query.eq('periodo_id', periodo_id);
    if (estudiante_id) query = query.eq('estudiante_id', estudiante_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/captura/asistencias
router.get('/asistencias', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { materia_id, periodo_id, grupo_id } = req.query;
    if (!materia_id && !grupo_id) return res.json({ success: true, data: [] });

    let query = supabase.from('asistencias')
      .select('estudiante_id, fecha, asistio')
      .limit(2000);
    if (materia_id) query = query.eq('materia_id', materia_id);
    if (periodo_id) query = query.eq('periodo_id', periodo_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/captura/resumen-grupo
router.get('/resumen-grupo', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { grupo_id, materia_id, periodo_id } = req.query;
    if (!grupo_id || !periodo_id) return res.json({ success: true, data: [] });

    const { data: inscripciones } = await supabase
      .from('inscripciones_periodo')
      .select('estudiante_id, cuatrimestre_actual, estudiante:estudiantes(id, matricula, nombre, apellido_paterno, carrera_id, carrera:carreras(clave_programa))')
      .eq('grupo_id', grupo_id);
    if (!inscripciones?.length) return res.json({ success: true, data: [] });

    const alumnoIds = inscripciones.map(i => i.estudiante_id);

    const { data: cals } = await supabase.from('calificaciones')
      .select('estudiante_id, materia_id, parcial_1, parcial_2, parcial_3')
      .in('estudiante_id', alumnoIds).eq('periodo_id', periodo_id);

    let asistMap = {};
    if (materia_id) {
      const { data: asists } = await supabase.from('asistencias')
        .select('estudiante_id, asistio')
        .in('estudiante_id', alumnoIds)
        .eq('materia_id', materia_id).eq('periodo_id', periodo_id);
      (asists || []).forEach(a => {
        if (!asistMap[a.estudiante_id]) asistMap[a.estudiante_id] = { total: 0, presentes: 0 };
        asistMap[a.estudiante_id].total++;
        if (a.asistio) asistMap[a.estudiante_id].presentes++;
      });
    }

    const { data: resumenes } = await supabase.from('resumen_academico')
      .select('estudiante_id, estado_riesgo')
      .in('estudiante_id', alumnoIds).eq('periodo_id', periodo_id);
    const riesgoMap = {};
    (resumenes || []).forEach(r => { riesgoMap[r.estudiante_id] = r.estado_riesgo; });

    const data = inscripciones.map(i => {
      const e        = i.estudiante;
      const alumnoId = i.estudiante_id;
      const misCals  = (cals || []).filter(c => c.estudiante_id === alumnoId);

      let promedioMateria = null;
      if (materia_id) {
        const calMat = misCals.find(c => c.materia_id === materia_id);
        if (calMat) {
          const p = [calMat.parcial_1, calMat.parcial_2, calMat.parcial_3].filter(v => v != null).map(parseFloat);
          promedioMateria = p.length ? Math.round(p.reduce((s, v) => s + v, 0) / p.length * 10) / 10 : null;
        }
      }

      let reprobadas = 0;
      misCals.forEach(c => {
        const p = [c.parcial_1, c.parcial_2, c.parcial_3].filter(v => v != null).map(parseFloat);
        if (p.length && p.reduce((s, v) => s + v, 0) / p.length < 7) reprobadas++;
      });

      const asistInfo    = asistMap[alumnoId];
      const asistenciaPct = asistInfo?.total > 0
        ? Math.round(asistInfo.presentes / asistInfo.total * 1000) / 10 : null;

      const nivelMap = { riesgo_critico:'critico', riesgo_moderado:'alto', alerta_temprana:'medio', estable:'bajo' };
      return {
        id: alumnoId, matricula: e?.matricula, nombre: e?.nombre,
        apellido_paterno: e?.apellido_paterno,
        carrera_clave: e?.carrera?.clave_programa || '—',
        semestre: i.cuatrimestre_actual,
        promedio_materia: promedioMateria,
        porcentaje_asistencia: asistenciaPct,
        materias_reprobadas: reprobadas,
        nivel_riesgo: nivelMap[riesgoMap[alumnoId]] || 'sin_datos',
      };
    });

    res.json({ success: true, data });
  } catch (e) {
    console.error('[RESUMEN-GRUPO]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/captura/guardar
router.post('/guardar', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { tipo, materia_id, parcial, periodo_id, registros } = req.body;

    // ── Asistencias ──
    if (tipo === 'asistencias') {
      if (!Array.isArray(registros) || registros.length === 0)
        return res.json({ success: true, message: '0 asistencias guardadas' });

      const hoy = new Date().toISOString().slice(0, 10);
      const futuras = registros.filter(r => r.fecha > hoy);
      if (futuras.length > 0)
        return res.status(400).json({
          success: false,
          message: `No se pueden guardar asistencias de fechas futuras (${futuras.length} registro${futuras.length > 1 ? 's' : ''} rechazado${futuras.length > 1 ? 's' : ''}).`,
        });

      let guardados = 0;
      const errors = [];
      for (const r of registros) {
        if (!r.alumno_id || !r.fecha || !r.estado) continue;
        const row = {
          estudiante_id: r.alumno_id, fecha: r.fecha,
          asistio: r.estado === 'presente' || r.estado === 'justificado',
          ...(r.materia_id ? { materia_id: r.materia_id } : {}),
          ...(periodo_id   ? { periodo_id }               : {}),
        };
        const { error } = await supabase.from('asistencias')
          .upsert(row, { onConflict: 'estudiante_id,materia_id,fecha', ignoreDuplicates: false });
        if (error) errors.push(error.message); else guardados++;
      }
      if (errors.length > 0) console.error('[ASISTENCIAS]', errors);

      const alumnosAfectados = [...new Set(registros.map(r => r.alumno_id).filter(Boolean))];
      const materiaAsist     = registros.find(r => r.materia_id)?.materia_id || null;
      if (periodo_id && materiaAsist) {
        Promise.all(alumnosAfectados.map(id => recalcularResumen(id, periodo_id, materiaAsist)))
          .catch(e => console.error('[RESUMEN] Error batch asistencias:', e.message));
      }
      return res.json({ success: true, message: `${guardados} asistencias guardadas correctamente` });
    }

    // ── Calificaciones ──
    if (!materia_id || !parcial || !Array.isArray(registros))
      return res.status(400).json({ success: false, message: 'Datos incompletos (materia_id, parcial y registros son requeridos)' });
    if (![1, 2, 3].includes(Number(parcial)))
      return res.status(400).json({ success: false, message: `Parcial ${parcial} no existe. Solo se permiten parcial_1, parcial_2 y parcial_3.` });

    const campo = `parcial_${parcial}`;
    let guardados = 0;
    for (const r of registros) {
      if (!r.alumno_id || r.calificacion === undefined || r.calificacion === '') continue;
      const valor = parseFloat(r.calificacion);
      if (isNaN(valor) || valor < 0 || valor > 100) continue;

      const base = { estudiante_id: r.alumno_id, materia_id, [campo]: valor, ...(periodo_id ? { periodo_id } : {}) };
      let existingQuery = supabase.from('calificaciones').select('id')
        .eq('estudiante_id', r.alumno_id).eq('materia_id', materia_id);
      if (periodo_id) existingQuery = existingQuery.eq('periodo_id', periodo_id);
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        await supabase.from('calificaciones').update({ [campo]: valor }).eq('id', existing.id);
      } else {
        await supabase.from('calificaciones').insert(base);
      }
      guardados++;
    }

    if (periodo_id) {
      const alumnosAfectados = [...new Set(registros.map(r => r.alumno_id).filter(Boolean))];
      Promise.all(alumnosAfectados.map(id => recalcularResumen(id, periodo_id, materia_id)))
        .catch(e => console.error('[RESUMEN] Error batch calificaciones:', e.message));
    }

    res.json({ success: true, message: `${guardados} calificaciones guardadas correctamente` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

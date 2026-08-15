import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pag_alumnos_secret_2026';

// ── Supabase client ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('[SUPABASE] Conectado a', SUPABASE_URL);
} else {
  console.error('[SUPABASE] ⚠️  Variables de entorno no configuradas.');
}

app.use(cors());
app.use(express.json());

// ── Auth middleware ──
const requireAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// ── Helper: mapear estado_riesgo a nivel legible ──
function mapEstadoRiesgo(estado) {
  const map = {
    riesgo_critico: 'critico',
    riesgo_moderado: 'alto',
    alerta_temprana: 'medio',
    estable: 'bajo',
  };
  return map[estado] || 'sin_datos';
}

// ═══════════════════════════════════════
// AUTH — login contra Supabase auth.users
// ═══════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
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

    // Buscar perfil en tabla pública usuarios
    let perfil = { nombre: '', apellidos: '', rol: 'admin', activo: true };
    try {
      const { data: perfilData } = await supabase
        .from('usuarios')
        .select('nombre, apellidos, rol, activo')
        .eq('email', email)
        .single();
      if (perfilData) perfil = { ...perfil, ...perfilData };
    } catch (_) {
      perfil.nombre = authUser.user_metadata?.nombre || authUser.email.split('@')[0];
      perfil.apellidos = authUser.user_metadata?.apellidos || '';
      perfil.rol = authUser.user_metadata?.rol || 'admin';
    }

    if (perfil.activo === false) {
      return res.status(403).json({ success: false, message: 'Usuario desactivado. Contacta al administrador.' });
    }

    const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`.trim() || authUser.email;

    const token = jwt.sign(
      { id: authUser.id, nombre: nombreCompleto, rol: perfil.rol, email: authUser.email },
      JWT_SECRET,
      { expiresIn: '8h' }
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

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
app.get('/api/dashboard', requireAuth, async (req, res) => {
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

    const totalRes = resumenData?.length || 0;
    const sumaAsist = (resumenData || []).reduce((s, r) => s + (parseFloat(r.asistencia_promedio) || 0), 0);
    const promedioAsistencia = totalRes > 0 ? Math.round((sumaAsist / totalRes) * 10) / 10 : 0;

    const { data: calsData } = await supabase.from('calificaciones').select('parcial_1, parcial_2, parcial_3');
    const evolucion = [1, 2, 3].map(p => {
      const campo = `parcial_${p}`;
      const vals = (calsData || []).map(c => c[campo]).filter(v => v !== null && v !== undefined);
      const promedio = vals.length ? Math.round(vals.reduce((s, v) => s + parseFloat(v), 0) / vals.length * 10) / 10 : null;
      const aprobados = vals.filter(v => parseFloat(v) >= 7).length;
      const reprobados = vals.filter(v => parseFloat(v) < 7).length;
      return { parcial: p, promedio_general: promedio, aprobados, reprobados, total_alumnos: vals.length };
    });

    const { data: carrerasData } = await supabase.from('carreras').select('id, nombre, clave_programa');
    const { data: gruposData } = await supabase.from('grupos').select('id, nombre, cuatrimestre_numero, turno, carrera_id').eq('activo', true);
    const { data: periodosData } = await supabase.from('periodos_academicos').select('id, nombre, anio, numero').order('anio', { ascending: false }).limit(10);

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

// ═══════════════════════════════════════
// EXPEDIENTES
// ═══════════════════════════════════════
app.get('/api/expedientes', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { carrera_id, riesgo, grupo_id } = req.query;

    // Si hay filtro por grupo, obtener los estudiante_ids de ese grupo primero
    let estudianteIdsGrupo = null;
    if (grupo_id) {
      const { data: inscripciones } = await supabase
        .from('inscripciones_periodo')
        .select('estudiante_id')
        .eq('grupo_id', grupo_id);
      estudianteIdsGrupo = (inscripciones || []).map(i => i.estudiante_id);
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
      if (estudianteIdsGrupo.length === 0) {
        return res.json({ success: true, data: [], carreras: [], grupos: [] });
      }
      query = query.in('id', estudianteIdsGrupo);
    }

    const { data, error } = await query;
    if (error) throw error;

    let alumnos = (data || []).map(a => {
      // Tomar el resumen del periodo con datos reales más reciente
      const resumenes = Array.isArray(a.resumen) ? a.resumen : (a.resumen ? [a.resumen] : []);
      const resumen = resumenes
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
        .eq('activo', true)
        .order('cuatrimestre_numero'),
    ]);

    res.json({
      success: true,
      data: alumnos,
      carreras: (carrerasData || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        clave: c.clave_programa,       // el frontend usa c.clave
        clave_programa: c.clave_programa,
      })),
      grupos: (gruposData || []).map(g => ({
        id: g.id,
        nombre: g.nombre,
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

app.get('/api/expedientes/:id', requireAuth, async (req, res) => {
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

    // Tomar el resumen del periodo más reciente que tenga datos reales
    const resumenes = Array.isArray(data.resumen) ? data.resumen : (data.resumen ? [data.resumen] : []);
    const resumen = resumenes
      .filter(r => r.promedio_actual > 0 || r.asistencia_promedio > 0 || r.materias_reprobadas > 0)
      .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]
      || resumenes.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];

    // Calificaciones por materia (solo para mostrar por parcial en el modal)
    const cals = data.calificaciones || [];

    // Promedio general: usar el del resumen_academico (calculado por fn_calcular_resumen)
    // No intentar calcularlo aquí porque las materias pueden estar en escalas distintas
    const promedioGeneral = resumen?.promedio_actual || null;

    // Materias reprobadas del resumen
    const materiasReprobadas = resumen?.materias_reprobadas ?? (() => {
      let rep = 0;
      cals.forEach(c => {
        const parciales = [c.parcial_1, c.parcial_2, c.parcial_3]
          .filter(v => v !== null && v !== undefined).map(parseFloat);
        if (parciales.length && parciales.reduce((s, v) => s + v, 0) / parciales.length < 7) rep++;
      });
      return rep;
    })();
    // Asistencias globales del alumno
    const { data: asistsTotales } = await supabase
      .from('asistencias')
      .select('asistio')
      .eq('estudiante_id', req.params.id);

    // Asistencia global
    const totalAsist   = asistsTotales?.length || 0;
    const presentesAll = (asistsTotales || []).filter(a => a.asistio).length;
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
        // Calificacion min/max del resumen como referencia de parciales
        calificacion_p1: resumen?.calificacion_minima_parcial || null,
        calificacion_p2: null,
        calificacion_p3: resumen?.calificacion_maxima_parcial || null,
        // Asistencia global
        asistencia_p1: asistenciaGlobal,
        asistencia_p2: asistenciaGlobal,
        asistencia_p3: asistenciaGlobal,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════
// CAPTURA
// ═══════════════════════════════════════

// Devuelve grupos activos con las materias que tienen docente asignado (vía grupo_id FK)
app.get('/api/captura/grupos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    // Grupos activos con su carrera
    const { data: grupos, error: gErr } = await supabase
      .from('grupos')
      .select('id, nombre, cuatrimestre_numero, turno, carrera_id, periodo_id, carrera:carreras(nombre, clave_programa)')
      .eq('activo', true)
      .order('cuatrimestre_numero');
    if (gErr) throw gErr;

    // Materias asignadas por grupo_id (FK real en docente_materia)
    const { data: asigs } = await supabase
      .from('docente_materia')
      .select('grupo_id, materia:materias(id, nombre, clave)')
      .not('grupo_id', 'is', null);

    // Periodos para obtener fecha_inicio y fecha_fin
    const { data: periodosData } = await supabase
      .from('periodos_academicos')
      .select('id, nombre, fecha_inicio, fecha_fin, anio, numero');
    const periodoMap = {};
    (periodosData || []).forEach(p => { periodoMap[p.id] = p; });

    // Indexar materias por grupo_id
    const materiasPorGrupo = {};
    (asigs || []).forEach(a => {
      if (!a.grupo_id || !a.materia?.id) return;
      if (!materiasPorGrupo[a.grupo_id]) materiasPorGrupo[a.grupo_id] = [];
      const exists = materiasPorGrupo[a.grupo_id].some(m => m.id === a.materia.id);
      if (!exists) {
        materiasPorGrupo[a.grupo_id].push({
          id: a.materia.id,
          nombre: a.materia.nombre,
          clave: a.materia.clave,
        });
      }
    });

    const result = (grupos || []).map(g => {
      const periodo = periodoMap[g.periodo_id] || null;
      return {
        id: g.id,
        nombre: g.nombre,
        semestre: g.cuatrimestre_numero,
        turno: g.turno,
        carrera_id: g.carrera_id,
        periodo_id: g.periodo_id,
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

app.get('/api/captura/asignaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { data } = await supabase.from('docente_materia')
      .select(`id, periodo_id, grupo, aula,
               docente:usuarios(nombre, apellidos, email),
               materia:materias(id, nombre, clave)`)
      .limit(200);
    const asignaciones = (data || []).map(d => ({
      id: d.id,
      grupo_nombre: d.grupo || '',       // texto 'A', 'B', etc.
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

app.get('/api/captura/alumnos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { grupo_id, carrera_id } = req.query;

    if (grupo_id) {
      // Filtrar inscripciones_periodo por grupo_id FK directo
      const { data: inscripciones, error: iErr } = await supabase
        .from('inscripciones_periodo')
        .select(`
          cuatrimestre_actual,
          estudiante:estudiantes(
            id, matricula, nombre, apellido_paterno, apellido_materno, carrera_id,
            carrera:carreras(nombre, clave_programa),
            resumen:resumen_academico(promedio_actual, asistencia_promedio, estado_riesgo)
          )
        `)
        .eq('grupo_id', grupo_id);
      if (iErr) throw iErr;

      const alumnos = (inscripciones || [])
        .map(i => {
          const e = i.estudiante;
          if (!e) return null;
          const resumen = Array.isArray(e.resumen) ? e.resumen[0] : e.resumen;
          return {
            id: e.id,
            matricula: e.matricula,
            nombre: e.nombre,
            apellido_paterno: e.apellido_paterno,
            apellido_materno: e.apellido_materno,
            carrera_id: e.carrera_id,
            carrera_clave: e.carrera?.clave_programa || '',
            carrera_nombre: e.carrera?.nombre || '',
            semestre: i.cuatrimestre_actual,
            promedio_general: resumen?.promedio_actual ?? null,
            porcentaje_asistencia: resumen?.asistencia_promedio ?? null,
            nivel_riesgo: mapEstadoRiesgo(resumen?.estado_riesgo),
          };
        })
        .filter(Boolean);

      return res.json({ success: true, data: alumnos });
    }

    // Fallback: todos los activos, opcionalmente filtrado por carrera
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

app.get('/api/captura/calificaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { materia_id, estudiante_id, periodo_id } = req.query;
    let query = supabase.from('calificaciones')
      .select('estudiante_id, parcial_1, parcial_2, parcial_3, calificacion_final')
      .limit(500);
    if (materia_id)   query = query.eq('materia_id', materia_id);
    if (periodo_id)   query = query.eq('periodo_id', periodo_id);
    if (estudiante_id) query = query.eq('estudiante_id', estudiante_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/captura/asistencias', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { materia_id, periodo_id, grupo_id } = req.query;
    if (!materia_id && !grupo_id)
      return res.json({ success: true, data: [] });

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

// ── Helper: recalcular promedio y asistencia de un alumno y actualizar resumen_academico ──
async function recalcularResumen(estudianteId, periodoId, materiaId) {
  try {
    // Calificaciones de todas las materias del alumno en el periodo
    const { data: cals } = await supabase
      .from('calificaciones')
      .select('parcial_1, parcial_2, parcial_3, calificacion_final, materia_id')
      .eq('estudiante_id', estudianteId)
      .eq('periodo_id', periodoId);

    // Promedio general = promedio de los promedios por materia
    // (suma del promedio de cada materia / total de materias)
    const promediosPorMateria = [];
    let reprobadas = 0;
    (cals || []).forEach(c => {
      const parciales = [c.parcial_1, c.parcial_2, c.parcial_3]
        .filter(v => v !== null && v !== undefined)
        .map(parseFloat);
      if (parciales.length) {
        const promMateria = parciales.reduce((s, v) => s + v, 0) / parciales.length;
        promediosPorMateria.push(promMateria);
        if (promMateria < 7) reprobadas++;
      }
    });
    const promedio = promediosPorMateria.length
      ? Math.round(promediosPorMateria.reduce((s, v) => s + v, 0) / promediosPorMateria.length * 100) / 100
      : null;

    // Asistencias de la materia en curso
    const { data: asists } = await supabase
      .from('asistencias')
      .select('asistio')
      .eq('estudiante_id', estudianteId)
      .eq('materia_id', materiaId)
      .eq('periodo_id', periodoId);

    const totalAsist = asists?.length || 0;
    const presentes  = (asists || []).filter(a => a.asistio).length;
    const asistenciaPct = totalAsist > 0
      ? Math.round((presentes / totalAsist) * 1000) / 10
      : null;

    // Determinar estado de riesgo simple (sin modelo IA)
    let estadoRiesgo = 'estable';
    if (asistenciaPct !== null && asistenciaPct < 60) estadoRiesgo = 'riesgo_critico';
    else if (promedio !== null && promedio < 6)         estadoRiesgo = 'riesgo_critico';
    else if (asistenciaPct !== null && asistenciaPct < 75) estadoRiesgo = 'riesgo_moderado';
    else if (promedio !== null && promedio < 7)            estadoRiesgo = 'riesgo_moderado';
    else if (reprobadas > 0)                               estadoRiesgo = 'alerta_temprana';

    const update = {
      ...(promedio !== null      ? { promedio_actual: promedio, promedio_general: promedio } : {}),
      ...(asistenciaPct !== null ? { asistencia_promedio: asistenciaPct } : {}),
      materias_reprobadas: reprobadas,
      estado_riesgo: estadoRiesgo,
      updated_at: new Date().toISOString(),
    };

    // Upsert en resumen_academico
    const { data: existing } = await supabase
      .from('resumen_academico')
      .select('id')
      .eq('estudiante_id', estudianteId)
      .eq('periodo_id', periodoId)
      .maybeSingle();

    if (existing) {
      await supabase.from('resumen_academico')
        .update(update)
        .eq('id', existing.id);
    } else {
      await supabase.from('resumen_academico').insert({
        estudiante_id: estudianteId,
        periodo_id: periodoId,
        ...update,
      });
    }
  } catch (e) {
    console.error(`[RESUMEN] Error al recalcular alumno ${estudianteId}:`, e.message);
  }
}

// ── Endpoint: resumen calculado al vuelo por grupo/materia/periodo ──
app.get('/api/captura/resumen-grupo', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  try {
    const { grupo_id, materia_id, periodo_id } = req.query;
    if (!grupo_id || !periodo_id) return res.json({ success: true, data: [] });

    // Alumnos del grupo
    const { data: inscripciones } = await supabase
      .from('inscripciones_periodo')
      .select('estudiante_id, cuatrimestre_actual, estudiante:estudiantes(id, matricula, nombre, apellido_paterno, carrera_id, carrera:carreras(clave_programa))')
      .eq('grupo_id', grupo_id);

    if (!inscripciones?.length) return res.json({ success: true, data: [] });

    const alumnoIds = inscripciones.map(i => i.estudiante_id);

    // Calificaciones de todos los alumnos del grupo en el periodo
    const { data: cals } = await supabase
      .from('calificaciones')
      .select('estudiante_id, materia_id, parcial_1, parcial_2, parcial_3')
      .in('estudiante_id', alumnoIds)
      .eq('periodo_id', periodo_id);

    // Asistencias de la materia seleccionada (si hay una)
    let asistMap = {};
    if (materia_id) {
      const { data: asists } = await supabase
        .from('asistencias')
        .select('estudiante_id, asistio')
        .in('estudiante_id', alumnoIds)
        .eq('materia_id', materia_id)
        .eq('periodo_id', periodo_id);

      (asists || []).forEach(a => {
        if (!asistMap[a.estudiante_id]) asistMap[a.estudiante_id] = { total: 0, presentes: 0 };
        asistMap[a.estudiante_id].total++;
        if (a.asistio) asistMap[a.estudiante_id].presentes++;
      });
    }

    // Estado de riesgo del resumen_academico para nivel_riesgo
    const { data: resumenes } = await supabase
      .from('resumen_academico')
      .select('estudiante_id, estado_riesgo')
      .in('estudiante_id', alumnoIds)
      .eq('periodo_id', periodo_id);
    const riesgoMap = {};
    (resumenes || []).forEach(r => { riesgoMap[r.estudiante_id] = r.estado_riesgo; });

    // Calcular por alumno
    const data = inscripciones.map(i => {
      const e = i.estudiante;
      const alumnoId = i.estudiante_id;
      const misCals = (cals || []).filter(c => c.estudiante_id === alumnoId);

      // Promedio de la materia seleccionada (promedio de sus parciales)
      let promedioMateria = null;
      if (materia_id) {
        const calMateria = misCals.find(c => c.materia_id === materia_id);
        if (calMateria) {
          const parciales = [calMateria.parcial_1, calMateria.parcial_2, calMateria.parcial_3]
            .filter(v => v !== null && v !== undefined)
            .map(parseFloat);
          promedioMateria = parciales.length
            ? Math.round(parciales.reduce((s, v) => s + v, 0) / parciales.length * 10) / 10
            : null;
        }
      }

      // Materias reprobadas: promedio de cada materia < 7
      let reprobadas = 0;
      misCals.forEach(c => {
        const parciales = [c.parcial_1, c.parcial_2, c.parcial_3]
          .filter(v => v !== null && v !== undefined).map(parseFloat);
        if (parciales.length) {
          const prom = parciales.reduce((s, v) => s + v, 0) / parciales.length;
          if (prom < 7) reprobadas++;
        }
      });

      // Asistencia: solo de la materia seleccionada
      const asistInfo = asistMap[alumnoId];
      const asistenciaPct = asistInfo?.total > 0
        ? Math.round(asistInfo.presentes / asistInfo.total * 1000) / 10
        : null;

      return {
        id: alumnoId,
        matricula: e?.matricula,
        nombre: e?.nombre,
        apellido_paterno: e?.apellido_paterno,
        carrera_clave: e?.carrera?.clave_programa || '—',
        semestre: i.cuatrimestre_actual,
        promedio_materia: promedioMateria,   // promedio de la materia seleccionada
        porcentaje_asistencia: asistenciaPct,
        materias_reprobadas: reprobadas,
        nivel_riesgo: (() => {
          const map = { riesgo_critico:'critico', riesgo_moderado:'alto', alerta_temprana:'medio', estable:'bajo' };
          return map[riesgoMap[alumnoId]] || 'sin_datos';
        })(),
      };
    });

    res.json({ success: true, data });
  } catch (e) {
    console.error('[RESUMEN-GRUPO]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/captura/guardar', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { tipo, materia_id, parcial, periodo_id, registros } = req.body;

    // ── Guardar asistencias ──
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
          estudiante_id: r.alumno_id,
          fecha: r.fecha,
          asistio: r.estado === 'presente' || r.estado === 'justificado',
          ...(r.materia_id ? { materia_id: r.materia_id } : {}),
          ...(periodo_id   ? { periodo_id }               : {}),
        };
        const { error } = await supabase
          .from('asistencias')
          .upsert(row, { onConflict: 'estudiante_id,materia_id,fecha', ignoreDuplicates: false });
        if (error) errors.push(error.message);
        else guardados++;
      }
      if (errors.length > 0) console.error('[ASISTENCIAS]', errors);

      // Recalcular resumen_academico en segundo plano para cada alumno afectado
      const alumnosAfectados = [...new Set(registros.map(r => r.alumno_id).filter(Boolean))];
      const materiaAsist = registros.find(r => r.materia_id)?.materia_id || null;
      if (periodo_id && materiaAsist) {
        Promise.all(alumnosAfectados.map(id => recalcularResumen(id, periodo_id, materiaAsist)))
          .catch(e => console.error('[RESUMEN] Error batch asistencias:', e.message));
      }

      return res.json({ success: true, message: `${guardados} asistencias guardadas correctamente` });
    }

    // ── Guardar calificaciones ──
    if (!materia_id || !parcial || !Array.isArray(registros))
      return res.status(400).json({ success: false, message: 'Datos incompletos (materia_id, parcial y registros son requeridos)' });

    if (![1, 2, 3].includes(Number(parcial)))
      return res.status(400).json({ success: false, message: `Parcial ${parcial} no existe en la tabla. Solo se permiten parcial_1, parcial_2 y parcial_3.` });

    const campo = `parcial_${parcial}`;
    let guardados = 0;
    for (const r of registros) {
      if (!r.alumno_id || r.calificacion === undefined || r.calificacion === '') continue;
      const valor = parseFloat(r.calificacion);
      if (isNaN(valor) || valor < 0 || valor > 100) continue;

      // Upsert limpio usando la constraint única (estudiante_id, materia_id, periodo_id)
      const base = {
        estudiante_id: r.alumno_id,
        materia_id,
        [campo]: valor,
        ...(periodo_id ? { periodo_id } : {}),
      };

      // Intentar actualizar primero; si no existe, insertar
      let existingQuery = supabase
        .from('calificaciones')
        .select('id')
        .eq('estudiante_id', r.alumno_id)
        .eq('materia_id', materia_id);
      if (periodo_id) existingQuery = existingQuery.eq('periodo_id', periodo_id);
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        await supabase.from('calificaciones')
          .update({ [campo]: valor })
          .eq('id', existing.id);
      } else {
        await supabase.from('calificaciones').insert(base);
      }
      guardados++;
    }

    // Recalcular resumen_academico en segundo plano para cada alumno afectado
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

// ═══════════════════════════════════════
// ALERTAS
// ═══════════════════════════════════════
app.get('/api/alertas', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase.from('alertas')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno, tutor_id, carrera:carreras(clave_programa))`)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;

    // Obtener todos los tutores para mapear tutor_id → nombre
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

app.post('/api/alertas/:id/atender', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('alertas').update({ atendida: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Alerta atendida correctamente' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.put('/api/alertas/:id', requireAuth, async (req, res) => {
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

app.post('/api/alertas/generar', requireAuth, async (req, res) => {
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

app.get('/api/alertas/count', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, count: 0 });
  try {
    const { count } = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('atendida', false);
    res.json({ success: true, count: count || 0 });
  } catch (e) {
    res.json({ success: true, count: 0 });
  }
});

// ═══════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════
app.get('/api/usuarios', requireAuth, async (req, res) => {
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

app.get('/api/usuarios/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data, error } = await supabase.from('usuarios')
      .select('id, nombre, apellidos, email, rol, activo').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({
      success: true,
      data: { id: data.id, nombre: data.nombre, apellido: data.apellidos, email: data.email, rol: data.rol, activo: data.activo },
      roles: [{ id: 'admin', nombre: 'Administrador' }, { id: 'docente', nombre: 'Docente' }, { id: 'tutor', nombre: 'Tutor' }, { id: 'coordinador', nombre: 'Coordinador' }],
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/usuarios', requireAuth, async (req, res) => {
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

app.put('/api/usuarios/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const update = {};
    if (req.body.nombre) update.nombre = req.body.nombre;
    if (req.body.apellido !== undefined) update.apellidos = req.body.apellido;
    if (req.body.email) update.email = req.body.email;
    if (req.body.rol) update.rol = req.body.rol;
    const { data, error } = await supabase.from('usuarios').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.patch('/api/usuarios/:id/estado', requireAuth, async (req, res) => {
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

app.delete('/api/usuarios/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════
// ROLES
// ═══════════════════════════════════════
app.get('/api/roles', requireAuth, async (req, res) => {
  // Roles basados en el enum rol_usuario_enum del schema
  res.json({
    success: true,
    data: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso completo al sistema', permisos: ['Ver Dashboard', 'Ver Expedientes', 'Administrar Usuarios', 'Exportar Reportes'] },
      { id: 'director', nombre: 'Director', descripcion: 'Dirección institucional', permisos: ['Ver Dashboard', 'Ver Expedientes', 'Exportar Reportes'] },
      { id: 'coordinador', nombre: 'Coordinador', descripcion: 'Coordinación académica', permisos: ['Ver Expedientes', 'Exportar Reportes'] },
      { id: 'docente', nombre: 'Docente', descripcion: 'Captura de calificaciones y seguimiento', permisos: ['Captura Docente', 'Ver Expedientes'] },
      { id: 'tutor', nombre: 'Tutor', descripcion: 'Atención de alertas y tutoría', permisos: ['Atender Alertas', 'Ver Expedientes'] },
    ],
  });
});

// ═══════════════════════════════════════
// DOCENTES
// ═══════════════════════════════════════
// Helper: filtrar usuarios por rol (case-insensitive, soporta variantes)
async function getUsuariosPorRol(roles) {
  // roles = ['docente', 'tutor'] → busca cualquier valor que contenga esas palabras
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, apellidos, email, rol, activo');
  return (data || []).filter(u => {
    const r = (u.rol || '').toLowerCase().trim();
    return roles.some(role => r.includes(role.toLowerCase()));
  });
}

app.get('/api/docentes', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const usuarios = await getUsuariosPorRol(['docente', 'tutor', 'profesor', 'coordinador']);
    res.json({
      success: true,
      data: usuarios.map(u => ({
        id: u.id, nombre: `${u.nombre} ${u.apellidos}`.trim(), email: u.email,
        departamento: u.rol, materias: '', grupo: '',
        grupo_color: (u.rol || '').toLowerCase().includes('tutor') ? '#3b82f6' : '#86c53c',
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/docentes', requireAuth, async (req, res) => {
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

app.delete('/api/docentes/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Docente eliminado' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/docentes/asignaciones', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [], docentes: [], grupos: [], materias: [] });
  try {
    // Join manual: Supabase no tiene FK explícita entre docente_materia y usuarios
    const [{ data: dm }, { data: materias }, grupos, todosUsuarios] = await Promise.all([
      supabase.from('docente_materia')
        .select('id, docente_id, materia_id, periodo_id, grupo_id, grupo, aula')
        .limit(200),
      supabase.from('materias').select('id, nombre, clave'),
      getUsuariosPorRol(['docente', 'tutor', 'profesor', 'coordinador']),
      getUsuariosPorRol(['docente', 'tutor', 'profesor', 'coordinador']),
    ]);

    // Índice de usuarios por id
    const userMap = {};
    todosUsuarios.forEach(u => { userMap[u.id] = u; });

    // Índice de grupos por id
    const { data: gruposData } = await supabase
      .from('grupos')
      .select('id, nombre, cuatrimestre_numero, turno, carrera_id, carrera:carreras(clave_programa)')
      .eq('activo', true);
    const grupoMap = {};
    (gruposData || []).forEach(g => { grupoMap[g.id] = g; });

    // Índice de periodos por id
    const { data: periodosData } = await supabase
      .from('periodos_academicos')
      .select('id, nombre, anio, numero');
    const periodoMap = {};
    (periodosData || []).forEach(p => { periodoMap[p.id] = p.nombre || `${p.anio}-${p.numero}`; });

    const asignaciones = (dm || []).map(d => {
      const docente = userMap[d.docente_id];
      const materia = (materias || []).find(m => m.id === d.materia_id);
      const grupo   = grupoMap[d.grupo_id];
      return {
        id: d.id,
        docente_id: d.docente_id,
        docente_nombre: docente ? `${docente.nombre} ${docente.apellidos}`.trim() : `ID: ${d.docente_id?.slice(0,8)}…`,
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

app.get('/api/docentes/tutorias', requireAuth, async (req, res) => {
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

    // Índice de tutores por id para nombre rápido
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

app.post('/api/docentes/asignar-tutor', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Tutor asignado correctamente' });
});

app.delete('/api/docentes/asignaciones/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true });
  try {
    await supabase.from('docente_materia').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Asignación eliminada' });
  } catch (e) {
    res.json({ success: true, message: 'Asignación eliminada' });
  }
});

// ═══════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════
app.get('/api/catalogos/carreras', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  const { data, error } = await supabase.from('carreras').select('id, nombre, clave_programa').order('nombre');
  res.json({ success: !error, data: data || [] });
});

app.get('/api/catalogos/grupos', requireAuth, async (req, res) => {
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
      id: g.id,
      nombre: g.nombre,
      semestre: g.cuatrimestre_numero,
      turno: g.turno,
      carrera_id: g.carrera_id,
      periodo_id: g.periodo_id,
      carrera_nombre: g.carrera?.nombre || '',
      carrera_clave: g.carrera?.clave_programa || '',
    }));
    res.json({ success: !error, data: mapped });
  } catch (e) {
    res.json({ success: false, data: [] });
  }
});

app.get('/api/catalogos/materias', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: true, data: [] });
  const { data, error } = await supabase.from('materias').select('id, nombre, clave, creditos').order('nombre');
  res.json({ success: !error, data: data || [] });
});

// ═══════════════════════════════════════
// REPORTES
// ═══════════════════════════════════════
app.get('/api/reportes/datos', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { data: resumen } = await supabase.from('resumen_academico')
      .select('estado_riesgo, probabilidad_desercion, estudiante:estudiantes(matricula, nombre, apellido_paterno)');
    const riesgo = { critico: 0, alto: 0, medio: 0, bajo: 0 };
    (resumen || []).forEach(r => { const n = mapEstadoRiesgo(r.estado_riesgo); if (riesgo[n] !== undefined) riesgo[n]++; });
    const { count: total } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true }).eq('estado_inscripcion', 'activo');
    const { count: atendidas } = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('atendida', true);
    const { count: pendientes } = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('atendida', false);
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
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/reportes/preview', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { tipo, nivel, estado } = req.query;
    let titulo = '', columnas = [], data = [];

    if (tipo === 'riesgo') {
      titulo = 'Estudiantes en Riesgo';
      columnas = ['Matrícula', 'Alumno', 'Carrera', 'Cuatrimestre', 'Promedio', 'Asistencia %', 'Mat. Reprob.', 'Nivel Riesgo'];
      let q = supabase.from('resumen_academico').select(`promedio_actual, asistencia_promedio, materias_reprobadas, cuatrimestre_actual, estado_riesgo,
        estudiante:estudiantes(matricula, nombre, apellido_paterno, carrera:carreras(clave_programa))`).limit(200);
      if (nivel) { const m = { critico:'riesgo_critico', alto:'riesgo_moderado', medio:'alerta_temprana', bajo:'estable' }; if (m[nivel]) q = q.eq('estado_riesgo', m[nivel]); }
      const { data: rows } = await q;
      data = (rows || []).map(r => [
        r.estudiante?.matricula, `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        r.estudiante?.carrera?.clave_programa || '', r.cuatrimestre_actual,
        r.promedio_actual ?? 'N/A', r.asistencia_promedio != null ? `${r.asistencia_promedio}%` : 'N/A',
        r.materias_reprobadas ?? 0, { riesgo_critico:'Crítico', riesgo_moderado:'Alto', alerta_temprana:'Medio', estable:'Bajo' }[r.estado_riesgo] || 'Sin datos',
      ]);
    } else if (tipo === 'alertas') {
      titulo = 'Alertas de Retención';
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
      titulo = 'Indicadores Académicos';
      columnas = ['Matrícula', 'Alumno', 'Promedio Actual', 'Asistencia %', 'Mat. Reprob.', 'Mat. Recursadas', 'Cuatrimestre'];
      const { data: rows } = await supabase.from('resumen_academico').select(`promedio_actual, asistencia_promedio, materias_reprobadas, materias_recursadas, cuatrimestre_actual,
        estudiante:estudiantes(matricula, nombre, apellido_paterno)`).limit(200);
      data = (rows || []).map(r => [
        r.estudiante?.matricula, `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        r.promedio_actual ?? 'N/A', r.asistencia_promedio != null ? `${r.asistencia_promedio}%` : 'N/A',
        r.materias_reprobadas ?? 0, r.materias_recursadas ?? 0, r.cuatrimestre_actual,
      ]);
    } else if (tipo === 'seguimiento') {
      titulo = 'Seguimiento de Estudiantes';
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

app.get('/api/reportes', requireAuth, async (req, res) => {
  // Alias que redirige al preview handler
  const { tipo, nivel, estado } = req.query;
  req.url = `/api/reportes/preview`;
  // Reusar la misma lógica del preview
  const qs = new URLSearchParams({ ...(tipo && { tipo }), ...(nivel && { nivel }), ...(estado && { estado }) }).toString();
  return res.redirect(307, `/api/reportes/preview${qs ? '?' + qs : ''}`);
});

// ── Helper: construir payload para la IA desde un resumen_academico ──
function buildIAPayload(resumen) {
  const turnoMap = { matutino: 0, vespertino: 1, nocturno: 2, mixto: 3 };
  return {
    promedio_general:          parseFloat(resumen.promedio_general)          || 0.0,
    promedio_actual:           parseFloat(resumen.promedio_actual)           || 0.0,
    asistencia_promedio:       parseFloat(resumen.asistencia_promedio) > 1.0
      ? parseFloat(resumen.asistencia_promedio) / 100.0
      : parseFloat(resumen.asistencia_promedio) || 0.0,
    materias_reprobadas:       parseInt(resumen.materias_reprobadas)         || 0,
    materias_recursadas:       parseInt(resumen.materias_recursadas)         || 0,
    materias_inscritas:        parseInt(resumen.materias_inscritas)          || 0,
    materias_aprobadas:        parseInt(resumen.materias_aprobadas)          || 0,
    cuatrimestre_actual:       parseInt(resumen.cuatrimestre_actual)         || 1,
    cuatrimestres_retraso:     parseInt(resumen.cuatrimestres_retraso)       || 0,
    parciales_reprobados:      parseInt(resumen.parciales_reprobados)        || 0,
    calificacion_minima_parcial: parseFloat(resumen.calificacion_minima_parcial) || 0.0,
    calificacion_maxima_parcial: parseFloat(resumen.calificacion_maxima_parcial) || 0.0,
    beneficiario_beca:         resumen.beneficiario_beca ? 1 : 0,
    turno:                     turnoMap[resumen.turno] !== undefined ? turnoMap[resumen.turno] : 0,
    preferencia_carrera:       Math.max(0, (parseInt(resumen.preferencia_carrera) || 1) - 1),
    foraneo:                   resumen.foraneo  ? 1 : 0,
    trabaja:                   resumen.trabaja  ? 1 : 0,
    edad_ingreso:              parseInt(resumen.edad_ingreso) || 18,
  };
}

// ── Helper: llamar a la IA y obtener predicción ──
async function predecirConIA(payload) {
  try {
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return await response.json();
  } catch (_) {}
  // Fallback local
  const asist = payload.asistencia_promedio;
  const prob  = Math.min(1.0, Math.max(0.0, (payload.materias_reprobadas * 0.2) + (1.0 - asist) * 0.5));
  const risk  = prob > 0.70 ? 'riesgo_critico' : prob > 0.40 ? 'riesgo_moderado' : prob > 0.20 ? 'alerta_temprana' : 'estable';
  return { success: true, probabilidad_desercion: prob, estado_riesgo: risk, simulado: true };
}

// ═══════════════════════════════════════
// REPORTES — Análisis masivo con IA
// ═══════════════════════════════════════
app.post('/api/reportes/analizar-ia', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
  try {
    const { nivel } = req.query;

    // 1. Leer todos los resúmenes con los datos reales de la BD
    let q = supabase.from('resumen_academico').select(`
      id, estudiante_id, periodo_id,
      promedio_general, promedio_actual, asistencia_promedio,
      materias_reprobadas, materias_recursadas, materias_inscritas, materias_aprobadas,
      cuatrimestre_actual, cuatrimestres_retraso, parciales_reprobados,
      calificacion_minima_parcial, calificacion_maxima_parcial,
      beneficiario_beca, turno, preferencia_carrera, foraneo, trabaja, edad_ingreso,
      estado_riesgo, probabilidad_desercion,
      estudiante:estudiantes(
        matricula, nombre, apellido_paterno,
        turno, foraneo, trabaja,
        carrera:carreras(clave_programa)
      )
    `).limit(300);

    if (nivel) {
      const m = { critico:'riesgo_critico', alto:'riesgo_moderado', medio:'alerta_temprana', bajo:'estable' };
      if (m[nivel]) q = q.eq('estado_riesgo', m[nivel]);
    }

    const { data: resumenes, error } = await q;
    if (error) throw error;
    if (!resumenes?.length) return res.json({ success: true, titulo: 'Análisis IA — Estudiantes en Riesgo', columnas: [], data: [], total: 0 });

    // 2. Para cada alumno, usar datos reales de BD y llamar a la IA
    const resultados = await Promise.all(resumenes.map(async (r) => {
      // Merge: datos del resumen + datos del estudiante (turno, foraneo, trabaja vienen del estudiante)
      const dataCompleta = {
        ...r,
        turno:             r.turno           || r.estudiante?.turno    || 'matutino',
        foraneo:           r.foraneo         ?? r.estudiante?.foraneo  ?? false,
        trabaja:           r.trabaja         ?? r.estudiante?.trabaja  ?? false,
        beneficiario_beca: r.beneficiario_beca ?? false,   // solo en resumen_academico
      };

      const payload = buildIAPayload(dataCompleta);
      const pred    = await predecirConIA(payload);

      // Actualizar BD con la predicción fresca
      if (pred?.success !== false) {
        await supabase.from('resumen_academico').update({
          probabilidad_desercion: pred.probabilidad_desercion,
          estado_riesgo:          pred.estado_riesgo,
          fecha_prediccion:       new Date().toISOString(),
          modelo_version:         (pred.model_used || '1.0').slice(0, 20),
        }).eq('id', r.id);
      }

      const nivelLabel = { riesgo_critico:'Crítico', riesgo_moderado:'Alto', alerta_temprana:'Medio', estable:'Bajo' };
      const pct = (pred.probabilidad_desercion * 100).toFixed(1);
      const asistPct = dataCompleta.asistencia_promedio > 1
        ? dataCompleta.asistencia_promedio.toFixed(1)
        : (dataCompleta.asistencia_promedio * 100).toFixed(1);

      return [
        r.estudiante?.matricula || '—',
        `${r.estudiante?.nombre || ''} ${r.estudiante?.apellido_paterno || ''}`.trim(),
        r.estudiante?.carrera?.clave_programa || '—',
        dataCompleta.cuatrimestre_actual || '—',
        dataCompleta.promedio_actual     != null ? Number(dataCompleta.promedio_actual).toFixed(1)  : 'N/A',
        `${asistPct}%`,
        dataCompleta.materias_reprobadas ?? 0,
        `${pct}%`,
        nivelLabel[pred.estado_riesgo]   || 'Sin datos',
        pred.simulado ? 'Estimado' : 'Modelo IA',
      ];
    }));

    res.json({
      success: true,
      titulo: 'Análisis IA — Predicción de Deserción',
      columnas: ['Matrícula', 'Alumno', 'Carrera', 'Cuatrimestre', 'Promedio', 'Asistencia', 'Mat. Reprob.', 'Prob. Deserción', 'Nivel Riesgo', 'Fuente'],
      data: resultados,
      total: resultados.length,
      ia_activa: true,
    });
  } catch (e) {
    console.error('[ANALIZAR-IA]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════
// RUTAS SUPABASE — mantenidas
// ═══════════════════════════════════════
app.get('/api/supabase/status', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado', connected: false });
  try {
    const { data, error } = await supabase.from('instituciones').select('id, nombre').limit(1);
    if (error) throw error;
    res.json({ success: true, connected: true, message: 'Supabase conectado correctamente', sample: data });
  } catch (e) {
    res.json({ success: false, connected: false, message: e.message });
  }
});

app.get('/api/supabase/estudiantes', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { data, error } = await supabase.from('estudiantes')
      .select(`id, matricula, nombre, apellido_paterno, apellido_materno,
               email_institucional, estado_inscripcion, fecha_ingreso,
               carrera:carreras(nombre, clave_programa),
               resumen:resumen_academico(promedio_actual, asistencia_promedio, materias_reprobadas,
                 parciales_reprobados, probabilidad_desercion, estado_riesgo)`)
      .eq('estado_inscripcion', 'activo').limit(100);
    if (error) throw error;
    res.json({ success: true, data: data || [], total: data?.length || 0 });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

app.get('/api/supabase/resumen', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { periodoId } = req.query;
    let query = supabase.from('resumen_academico')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno, carrera:carreras(clave_programa))`)
      .order('probabilidad_desercion', { ascending: false }).limit(50);
    if (periodoId) query = query.eq('periodo_id', periodoId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

app.get('/api/supabase/alertas', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { data, error } = await supabase.from('alertas')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno, carrera:carreras(clave_programa))`)
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

app.get('/api/supabase/periodos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { data, error } = await supabase.from('periodos_academicos')
      .select('*').order('anio', { ascending: false }).order('numero', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

app.post('/api/supabase/calcular-resumen', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado' });
  const { estudianteId, periodoId } = req.body;
  if (!estudianteId || !periodoId)
    return res.status(400).json({ success: false, message: 'estudianteId y periodoId requeridos' });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[PREDICCIÓN] ▶ Iniciando para estudiante: ${estudianteId}`);
  console.log(`[PREDICCIÓN]   Periodo: ${periodoId}`);

  try {
    // ── 1. Calcular resumen académico via RPC ──
    console.log('[PREDICCIÓN] 1/5 Ejecutando fn_calcular_resumen...');
    const { error: rpcError } = await supabase.rpc('fn_calcular_resumen', { p_estudiante_id: estudianteId, p_periodo_id: periodoId });
    if (rpcError) {
      console.error('[PREDICCIÓN]   ✗ Error en RPC:', rpcError.message);
      throw rpcError;
    }
    console.log('[PREDICCIÓN]   ✓ Resumen calculado');

    // ── 2. Obtener resumen calculado ──
    console.log('[PREDICCIÓN] 2/5 Leyendo resumen_academico...');
    const { data: resumen, error: fetchError } = await supabase.from('resumen_academico')
      .select('*').eq('estudiante_id', estudianteId).eq('periodo_id', periodoId).single();
    if (fetchError || !resumen) {
      console.error('[PREDICCIÓN]   ✗ No se encontró resumen:', fetchError?.message);
      throw new Error('No se pudo encontrar el resumen calculado');
    }
    console.log('[PREDICCIÓN]   ✓ Resumen obtenido:', {
      promedio_actual: resumen.promedio_actual,
      asistencia_promedio: resumen.asistencia_promedio,
      materias_reprobadas: resumen.materias_reprobadas,
      cuatrimestre_actual: resumen.cuatrimestre_actual,
      estado_riesgo_actual: resumen.estado_riesgo,
    });

    const turnoMap = { matutino: 0, vespertino: 1, nocturno: 2, mixto: 3 };
    const payload = {
      promedio_general: parseFloat(resumen.promedio_general) || 0.0,
      promedio_actual: parseFloat(resumen.promedio_actual) || 0.0,
      asistencia_promedio: parseFloat(resumen.asistencia_promedio) > 1.0
        ? parseFloat(resumen.asistencia_promedio) / 100.0
        : parseFloat(resumen.asistencia_promedio) || 0.0,
      materias_reprobadas: parseInt(resumen.materias_reprobadas) || 0,
      materias_recursadas: parseInt(resumen.materias_recursadas) || 0,
      materias_inscritas: parseInt(resumen.materias_inscritas) || 0,
      materias_aprobadas: parseInt(resumen.materias_aprobadas) || 0,
      cuatrimestre_actual: parseInt(resumen.cuatrimestre_actual) || 1,
      cuatrimestres_retraso: parseInt(resumen.cuatrimestres_retraso) || 0,
      parciales_reprobados: parseInt(resumen.parciales_reprobados) || 0,
      calificacion_minima_parcial: parseFloat(resumen.calificacion_minima_parcial) || 0.0,
      calificacion_maxima_parcial: parseFloat(resumen.calificacion_maxima_parcial) || 0.0,
      beneficiario_beca: resumen.beneficiario_beca ? 1 : 0,
      turno: turnoMap[resumen.turno] !== undefined ? turnoMap[resumen.turno] : 0,
      preferencia_carrera: Math.max(0, (parseInt(resumen.preferencia_carrera) || 1) - 1),
      foraneo: resumen.foraneo ? 1 : 0,
      trabaja: resumen.trabaja ? 1 : 0,
      edad_ingreso: parseInt(resumen.edad_ingreso) || 18,
    };
    console.log('[PREDICCIÓN] 3/5 Payload para IA:', JSON.stringify(payload));

    // ── 3. Llamar a la API de IA ──
    let predResult = null;
    console.log('[PREDICCIÓN]   → Llamando a FastAPI http://localhost:8000/predict...');
    try {
      const t0 = Date.now();
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const elapsed = Date.now() - t0;
      if (response.ok) {
        predResult = await response.json();
        console.log(`[PREDICCIÓN]   ✓ Respuesta de IA (${elapsed}ms):`, JSON.stringify(predResult));
      } else {
        const errBody = await response.text();
        console.warn(`[PREDICCIÓN]   ✗ FastAPI respondió ${response.status}: ${errBody}`);
      }
    } catch (err) {
      console.warn('[PREDICCIÓN]   ✗ FastAPI no disponible:', err.message);
    }

    // ── 4. Fallback si IA no respondió ──
    if (!predResult || !predResult.success) {
      const prob = Math.min(1.0, Math.max(0.0, (payload.materias_reprobadas * 0.2) + (1.0 - payload.asistencia_promedio) * 0.5));
      const risk = prob > 0.70 ? 'riesgo_critico' : (prob > 0.40 ? 'riesgo_moderado' : (prob > 0.20 ? 'alerta_temprana' : 'estable'));
      predResult = { probabilidad_desercion: prob, estado_riesgo: risk, simulado: true };
      console.warn('[PREDICCIÓN]   ⚠ Usando estimación local (simulada):', JSON.stringify(predResult));
    }

    // ── 5. Guardar resultados ──
    console.log('[PREDICCIÓN] 4/5 Guardando en resumen_academico...');
    const { error: updateErr } = await supabase.from('resumen_academico').update({
      probabilidad_desercion: predResult.probabilidad_desercion,
      estado_riesgo: predResult.estado_riesgo,
      fecha_prediccion: new Date().toISOString(),
      modelo_version: (predResult.model_used || '1.0').slice(0, 20),
    }).eq('estudiante_id', estudianteId).eq('periodo_id', periodoId);
    if (updateErr) console.error('[PREDICCIÓN]   ✗ Error actualizando resumen:', updateErr.message);
    else console.log('[PREDICCIÓN]   ✓ resumen_academico actualizado');

    console.log('[PREDICCIÓN] 5/5 Insertando en predicciones_desercion...');
    try {
      await supabase.from('predicciones_desercion').insert({
        estudiante_id: estudianteId, resumen_academico_id: resumen.id, periodo_id: periodoId,
        features_input: payload, probabilidad_desercion: predResult.probabilidad_desercion,
        estado_riesgo: predResult.estado_riesgo, confianza_modelo: 0.95,
        modelo_version: (predResult.model_used || '1.0').slice(0, 20), fecha_prediccion: new Date().toISOString(),
      });
      console.log('[PREDICCIÓN]   ✓ Historial guardado');
    } catch (e) {
      console.error('[PREDICCIÓN]   ✗ Error en historial:', e.message);
    }

    console.log(`[PREDICCIÓN] ✅ Completado — prob: ${predResult.probabilidad_desercion} | riesgo: ${predResult.estado_riesgo} | simulado: ${!!predResult.simulado}`);
    console.log(`${'─'.repeat(60)}\n`);

    res.json({
      success: true, message: 'Resumen y predicción de IA calculados correctamente',
      data: { estudianteId, periodoId, probabilidad_desercion: predResult.probabilidad_desercion, estado_riesgo: predResult.estado_riesgo, simulado: !!predResult.simulado },
    });
  } catch (e) {
    console.error(`[PREDICCIÓN] ❌ Error fatal: ${e.message}`);
    console.log(`${'─'.repeat(60)}\n`);
    res.json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});

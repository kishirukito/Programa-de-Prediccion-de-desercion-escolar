import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/supabase/status
router.get('/status', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado', connected: false });
  try {
    const { data, error } = await supabase.from('instituciones').select('id, nombre').limit(1);
    if (error) throw error;
    res.json({ success: true, connected: true, message: 'Supabase conectado correctamente', sample: data });
  } catch (e) {
    res.json({ success: false, connected: false, message: e.message });
  }
});

// GET /api/supabase/estudiantes
router.get('/estudiantes', requireAuth, async (req, res) => {
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

// GET /api/supabase/resumen
router.get('/resumen', requireAuth, async (req, res) => {
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

// GET /api/supabase/alertas
router.get('/alertas', requireAuth, async (req, res) => {
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

// GET /api/supabase/periodos
router.get('/periodos', requireAuth, async (req, res) => {
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

// POST /api/supabase/calcular-resumen  (predicción IA)
router.post('/calcular-resumen', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado' });
  const { estudianteId, periodoId } = req.body;
  if (!estudianteId || !periodoId)
    return res.status(400).json({ success: false, message: 'estudianteId y periodoId requeridos' });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[PREDICCIÓN] ▶ Iniciando para estudiante: ${estudianteId}`);
  console.log(`[PREDICCIÓN]   Periodo: ${periodoId}`);

  try {
    // 1. Calcular resumen via RPC
    console.log('[PREDICCIÓN] 1/5 Ejecutando fn_calcular_resumen...');
    const { error: rpcError } = await supabase.rpc('fn_calcular_resumen', { p_estudiante_id: estudianteId, p_periodo_id: periodoId });
    if (rpcError) { console.error('[PREDICCIÓN]   ✗ Error en RPC:', rpcError.message); throw rpcError; }
    console.log('[PREDICCIÓN]   ✓ Resumen calculado');

    // 2. Obtener resumen
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

    // 3. Construir payload para IA
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

    // 4. Llamar a FastAPI
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

    // 5. Fallback local si IA no responde
    if (!predResult || !predResult.success) {
      const prob = Math.min(1.0, Math.max(0.0, (payload.materias_reprobadas * 0.2) + (1.0 - payload.asistencia_promedio) * 0.5));
      const risk = prob > 0.70 ? 'riesgo_critico' : prob > 0.40 ? 'riesgo_moderado' : prob > 0.20 ? 'alerta_temprana' : 'estable';
      predResult = { probabilidad_desercion: prob, estado_riesgo: risk, simulado: true };
      console.warn('[PREDICCIÓN]   ⚠ Usando estimación local:', JSON.stringify(predResult));
    }

    // 6. Guardar en BD
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
        modelo_version: (predResult.model_used || '1.0').slice(0, 20),
        fecha_prediccion: new Date().toISOString(),
      });
      console.log('[PREDICCIÓN]   ✓ Historial guardado');
    } catch (e) {
      console.error('[PREDICCIÓN]   ✗ Error en historial:', e.message);
    }

    console.log(`[PREDICCIÓN] ✅ Completado — prob: ${predResult.probabilidad_desercion} | riesgo: ${predResult.estado_riesgo} | simulado: ${!!predResult.simulado}`);
    console.log(`${'─'.repeat(60)}\n`);

    res.json({
      success: true,
      message: 'Resumen y predicción de IA calculados correctamente',
      data: {
        estudianteId, periodoId,
        probabilidad_desercion: predResult.probabilidad_desercion,
        estado_riesgo: predResult.estado_riesgo,
        simulado: !!predResult.simulado,
      },
    });
  } catch (e) {
    console.error(`[PREDICCIÓN] ❌ Error fatal: ${e.message}`);
    console.log(`${'─'.repeat(60)}\n`);
    res.json({ success: false, message: e.message });
  }
});

export default router;

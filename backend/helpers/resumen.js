import { supabase } from '../db.js';

/**
 * Recalcula el promedio y asistencia de un alumno en un periodo/materia
 * y actualiza (o crea) su fila en resumen_academico.
 * Se llama en segundo plano después de guardar calificaciones o asistencias.
 */
export async function recalcularResumen(estudianteId, periodoId, materiaId) {
  try {
    // Calificaciones de todas las materias del alumno en el periodo
    const { data: cals } = await supabase
      .from('calificaciones')
      .select('parcial_1, parcial_2, parcial_3, calificacion_final, materia_id')
      .eq('estudiante_id', estudianteId)
      .eq('periodo_id', periodoId);

    // Promedio general = promedio de los promedios por materia
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

    // Estado de riesgo básico (sin modelo IA)
    let estadoRiesgo = 'estable';
    if (asistenciaPct !== null && asistenciaPct < 60) estadoRiesgo = 'riesgo_critico';
    else if (promedio !== null && promedio < 6)              estadoRiesgo = 'riesgo_critico';
    else if (asistenciaPct !== null && asistenciaPct < 75)   estadoRiesgo = 'riesgo_moderado';
    else if (promedio !== null && promedio < 7)              estadoRiesgo = 'riesgo_moderado';
    else if (reprobadas > 0)                                 estadoRiesgo = 'alerta_temprana';

    const update = {
      ...(promedio !== null      ? { promedio_actual: promedio, promedio_general: promedio } : {}),
      ...(asistenciaPct !== null ? { asistencia_promedio: asistenciaPct }                   : {}),
      materias_reprobadas: reprobadas,
      estado_riesgo: estadoRiesgo,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('resumen_academico')
      .select('id')
      .eq('estudiante_id', estudianteId)
      .eq('periodo_id', periodoId)
      .maybeSingle();

    if (existing) {
      await supabase.from('resumen_academico').update(update).eq('id', existing.id);
    } else {
      await supabase.from('resumen_academico').insert({ estudiante_id: estudianteId, periodo_id: periodoId, ...update });
    }
  } catch (e) {
    console.error(`[RESUMEN] Error al recalcular alumno ${estudianteId}:`, e.message);
  }
}

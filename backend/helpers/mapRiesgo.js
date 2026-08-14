/**
 * Mapea el valor de estado_riesgo de la BD al nivel legible del frontend.
 * @param {string} estado - Valor del enum estado_riesgo_enum
 * @returns {'critico'|'alto'|'medio'|'bajo'|'sin_datos'}
 */
export function mapEstadoRiesgo(estado) {
  const map = {
    riesgo_critico:  'critico',
    riesgo_moderado: 'alto',
    alerta_temprana: 'medio',
    estable:         'bajo',
  };
  return map[estado] || 'sin_datos';
}

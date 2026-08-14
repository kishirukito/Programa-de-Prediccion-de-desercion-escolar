import { supabase } from '../db.js';

/**
 * Devuelve todos los usuarios cuyo rol contenga alguna de las palabras dadas.
 * La comparación es case-insensitive y soporta variantes ('Tutor Académico', 'Docente', etc.)
 * @param {string[]} roles - ej. ['docente', 'tutor']
 */
export async function getUsuariosPorRol(roles) {
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, apellidos, email, rol, activo');
  return (data || []).filter(u => {
    const r = (u.rol || '').toLowerCase().trim();
    return roles.some(role => r.includes(role.toLowerCase()));
  });
}

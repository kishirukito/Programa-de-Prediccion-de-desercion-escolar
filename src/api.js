const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  const data = await res.json();

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }

  if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch('/auth/me'),

  // Dashboard
  dashboard: (params = '') => apiFetch(`/dashboard${params}`),

  // Expedientes
  expedientes: (params = '') => apiFetch(`/expedientes${params}`),
  expediente: (id) => apiFetch(`/expedientes/${id}`),

  // Captura
  capturaGrupos: () => apiFetch('/captura/grupos'),
  asignaciones: () => apiFetch('/captura/asignaciones'),
  alumnosGrupo: (grupoId) => apiFetch(`/captura/alumnos?grupo_id=${grupoId}`),
  resumenGrupo: (grupoId, materiaId, periodoId) =>
    apiFetch(`/captura/resumen-grupo?grupo_id=${grupoId}${materiaId ? `&materia_id=${materiaId}` : ''}${periodoId ? `&periodo_id=${periodoId}` : ''}`),
  calificacionesGrupo: (grupoId, materiaId) => apiFetch(`/captura/calificaciones?grupo_id=${grupoId}&materia_id=${materiaId}`),
  calificacionesMateria: (materiaId, periodoId) => apiFetch(`/captura/calificaciones?materia_id=${materiaId}${periodoId ? `&periodo_id=${periodoId}` : ''}`),
  asistenciasMateria: (materiaId, periodoId) => apiFetch(`/captura/asistencias?materia_id=${materiaId}${periodoId ? `&periodo_id=${periodoId}` : ''}`),
  guardarCaptura: (body) => apiFetch('/captura/guardar', { method: 'POST', body: JSON.stringify(body) }),

  // Alertas
  alertas: () => apiFetch('/alertas'),
  atenderAlerta: (id) => apiFetch(`/alertas/${id}/atender`, { method: 'POST', body: '{}' }),
  updateAlerta: (id, body) => apiFetch(`/alertas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  generarAlertas: () => apiFetch('/alertas/generar', { method: 'POST', body: '{}' }),
  contarAlertas: () => apiFetch('/alertas/count'),

  // Usuarios
  usuarios: () => apiFetch('/usuarios'),
  crearUsuario: (body) => apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(body) }),
  toggleUsuario: (id) => apiFetch(`/usuarios/${id}/estado`, { method: 'PATCH', body: '{}' }),
  getUsuario: (id) => apiFetch(`/usuarios/${id}`),
  editarUsuario: (id, body) => apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  eliminarUsuario: (id) => apiFetch(`/usuarios/${id}`, { method: 'DELETE' }),

  // Roles
  roles: () => apiFetch('/roles'),

  // Docentes
  docentes: () => apiFetch('/docentes'),
  crearDocente: (body) => apiFetch('/docentes', { method: 'POST', body: JSON.stringify(body) }),
  eliminarDocente: (id) => apiFetch(`/docentes/${id}`, { method: 'DELETE' }),
  asignacionesDocente: () => apiFetch('/docentes/asignaciones'),
  tutoriasDocente: () => apiFetch('/docentes/tutorias'),
  asignarTutor: (body) => apiFetch('/docentes/asignar-tutor', { method: 'POST', body: JSON.stringify(body) }),
  eliminarAsignacion: (id) => apiFetch(`/docentes/asignaciones/${id}`, { method: 'DELETE' }),

  // Reportes
  reportesDatos: () => apiFetch('/reportes/datos'),
  generarReporte: (tipo, extra = '') => apiFetch(`/reportes/preview?tipo=${tipo}${extra}`),

  // Supabase
  supabaseStatus: () => apiFetch('/supabase/status'),
  supabaseEstudiantes: () => apiFetch('/supabase/estudiantes'),
  supabaseResumen: (periodoId = '') => apiFetch(`/supabase/resumen${periodoId ? `?periodoId=${periodoId}` : ''}`),
  supabaseAlertas: () => apiFetch('/supabase/alertas'),
  supabasePeriodos: () => apiFetch('/supabase/periodos'),
  supabaseCalcular: (estudianteId, periodoId) => apiFetch('/supabase/calcular-resumen', { method: 'POST', body: JSON.stringify({ estudianteId, periodoId }) }),
  carreras: () => apiFetch('/catalogos/carreras'),
};

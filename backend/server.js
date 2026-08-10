import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pag_alumnos_secret_2026';

// ── Supabase client ──
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('[SUPABASE] Conectado a', process.env.SUPABASE_URL);
} else {
  console.warn('[SUPABASE] No configurado — usando datos mock');
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
    res.status(403).json({ success: false, message: 'Token inválido' });
  }
};

// ── Usuarios demo ──
const usuarios = [
  { id: 1, nombre: 'Camila', apellido: 'Flores', email: 'admin@unipolidgo.edu.mx', password: 'Admin123!', rol_id: 1, rol: 'Administrador', activo: true },
  { id: 2, nombre: 'María', apellido: 'Delgado', email: 'maria.delgado@unipolidgo.edu.mx', password: 'Docente123!', rol_id: 3, rol: 'Docente', activo: true },
  { id: 3, nombre: 'Roberto', apellido: 'Solís', email: 'roberto.solis@unipolidgo.edu.mx', password: 'Tutor123!', rol_id: 4, rol: 'Tutor', activo: true },
];

// ── Catálogos ──
const carreras = [
  { id: 1, nombre: 'Ingeniería en Software', clave: 'ISW' },
  { id: 2, nombre: 'Ingeniería en Mecatrónica', clave: 'IM1' },
  { id: 3, nombre: 'Ingeniería Industrial', clave: 'II' },
];

const grupos = [
  { id: 1, nombre: 'A', carrera_id: 1, semestre: 9, turno: 'matutino', carrera_clave: 'ISW' },
  { id: 2, nombre: 'A', carrera_id: 2, semestre: 5, turno: 'matutino', carrera_clave: 'IM1' },
];

const materias = [
  { id: 1, nombre: 'Cálculo Diferencial', clave: 'MAT-101' },
  { id: 2, nombre: 'Programación Orientada a Objetos', clave: 'ISW-203' },
  { id: 3, nombre: 'Física General', clave: 'FIS-101' },
  { id: 4, nombre: 'Robótica', clave: 'IM1-301' },
];

const roles = [
  { id: 1, nombre: 'Administrador', descripcion: 'Acceso completo a métricas, expedientes, usuarios e IA.',
    permisos: ['Ver Dashboard', 'Ver Expedientes', 'Administrar Usuarios', 'Exportar Reportes'] },
  { id: 2, nombre: 'Docente', descripcion: 'Captura de calificaciones, asistencias y variables de riesgo.',
    permisos: ['Captura Docente', 'Ver Expedientes'] },
  { id: 3, nombre: 'Tutor', descripcion: 'Atención de alertas y seguimiento individual de expedientes.',
    permisos: ['Atender Alertas', 'Ver Expedientes', 'Exportar Reportes'] },
];

const docentes = [
  { id: 1, nombre: 'Prof. María Delgado', departamento: 'Ingeniería de Software', materias: 'Cálculo Diferencial, POO', grupo: 'ISW 9° "A"', grupo_color: '#86c53c' },
  { id: 2, nombre: 'Tutor Roberto Solís', departamento: 'Mecatrónica', materias: 'Física General, Robótica', grupo: 'IM1 5° "A"', grupo_color: '#3b82f6' },
];

// ── Alumnos con variables para IA (18 variables MDI) ──
let alumnos = [
  { id: 1, matricula: '2024001', nombre: 'Carlos', apellido_paterno: 'Ramírez', apellido_materno: 'Gómez',
    carrera_id: 1, grupo_id: 1, semestre: 9, estado: 'activo',
    // Variables IA
    promedio_general: 55.2, porcentaje_asistencia: 62,
    materias_reprobadas: 3, parciales_reprobados: 5,
    recursamiento: 1, num_recursamiento: 1,
    calificacion_p1: 50, calificacion_p2: 48, calificacion_p3: null,
    asistencia_p1: 65, asistencia_p2: 60, asistencia_p3: null,
    nivel_riesgo: 'critico'
  },
  { id: 2, matricula: '2024002', nombre: 'Ana', apellido_paterno: 'Martínez', apellido_materno: 'López',
    carrera_id: 1, grupo_id: 1, semestre: 9, estado: 'activo',
    promedio_general: 68, porcentaje_asistencia: 80,
    materias_reprobadas: 1, parciales_reprobados: 2,
    recursamiento: 0, num_recursamiento: 0,
    calificacion_p1: 65, calificacion_p2: 70, calificacion_p3: null,
    asistencia_p1: 82, asistencia_p2: 78, asistencia_p3: null,
    nivel_riesgo: 'alto'
  },
  { id: 3, matricula: '2024003', nombre: 'Luis', apellido_paterno: 'Hernández', apellido_materno: 'Díaz',
    carrera_id: 1, grupo_id: 1, semestre: 9, estado: 'activo',
    promedio_general: 72.5, porcentaje_asistencia: 85,
    materias_reprobadas: 1, parciales_reprobados: 1,
    recursamiento: 0, num_recursamiento: 0,
    calificacion_p1: 70, calificacion_p2: 75, calificacion_p3: null,
    asistencia_p1: 88, asistencia_p2: 82, asistencia_p3: null,
    nivel_riesgo: 'medio'
  },
  { id: 4, matricula: '2024004', nombre: 'Jorge', apellido_paterno: 'Castillo', apellido_materno: 'Morales',
    carrera_id: 1, grupo_id: 1, semestre: 9, estado: 'activo',
    promedio_general: 81, porcentaje_asistencia: 92,
    materias_reprobadas: 0, parciales_reprobados: 0,
    recursamiento: 0, num_recursamiento: 0,
    calificacion_p1: 80, calificacion_p2: 82, calificacion_p3: null,
    asistencia_p1: 93, asistencia_p2: 91, asistencia_p3: null,
    nivel_riesgo: 'bajo'
  },
];

let alertas = [
  { id: 1, alumno_id: 1, nivel_riesgo: 'critico', motivo: 'Reprobó 3 parciales consecutivos', tipo: 'Reprobación Crítica', estado: 'pendiente', fecha: '2026-08-01' },
  { id: 2, alumno_id: 4, nivel_riesgo: 'alto', motivo: 'Asistencia inferior al 60%', tipo: 'Baja Asistencia', estado: 'pendiente', fecha: '2026-08-03' },
];

let calificaciones = [];
let asistencias = [];

// ── Helper: calcular nivel riesgo ──
function calcRiesgo(promedio, asistencia) {
  if (promedio === null && asistencia === null) return 'sin_datos';
  if ((promedio !== null && promedio < 60) || (asistencia !== null && asistencia < 60)) return 'critico';
  if ((promedio !== null && promedio < 70) || (asistencia !== null && asistencia < 75)) return 'alto';
  if ((promedio !== null && promedio < 85) || (asistencia !== null && asistencia < 90)) return 'medio';
  return 'bajo';
}

// ═══════════════════════════════════════
// RUTAS AUTH
// ═══════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos.' });

  const user = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });

  const token = jwt.sign({ id: user.id, nombre: user.nombre + ' ' + user.apellido, rol: user.rol, rol_id: user.rol_id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ success: true, token, user: { id: user.id, name: user.nombre + ' ' + user.apellido, role: user.rol, email: user.email } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ═══════════════════════════════════════
// RUTAS DASHBOARD
// ═══════════════════════════════════════
app.get('/api/dashboard', requireAuth, (req, res) => {
  const riesgo = { critico: 0, alto: 0, medio: 0, bajo: 0, sin_datos: 0 };
  alumnos.forEach(a => { riesgo[a.nivel_riesgo] = (riesgo[a.nivel_riesgo] || 0) + 1; });

  const promedioAsist = Math.round(alumnos.reduce((s, a) => s + (a.porcentaje_asistencia || 0), 0) / alumnos.length * 10) / 10;

  const evolucion = [1, 2, 3].map(p => {
    const campo_cal = `calificacion_p${p}`;
    const vals = alumnos.map(a => a[campo_cal]).filter(v => v !== null && v !== undefined);
    const promedio = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null;
    const aprobados = vals.filter(v => v >= 70).length;
    const reprobados = vals.filter(v => v < 70).length;
    return { parcial: p, promedio_general: promedio, aprobados, reprobados, total_alumnos: vals.length };
  });

  const alertasPendientes = alertas.filter(a => a.estado === 'pendiente').length;

  res.json({
    success: true,
    data: {
      total_estudiantes: alumnos.length,
      alertas_pendientes: alertasPendientes,
      promedio_asistencia: promedioAsist,
      riesgo,
      evolucion_rendimiento: evolucion,
      materias_reprobacion: [
        { materia: 'Cálculo Diferencial', clave: 'MAT-101', total_alumnos: 45, promedio: 58.4, reprobados: 18, pct_reprobacion: 40.0 },
        { materia: 'Prog. Orientada a Objetos', clave: 'ISW-203', total_alumnos: 38, promedio: 64.2, reprobados: 12, pct_reprobacion: 31.6 },
      ],
      alumnos_riesgo_recientes: alumnos.filter(a => a.nivel_riesgo === 'critico' || a.nivel_riesgo === 'alto').slice(0, 5),
    },
    filtros: {
      grupos,
      carreras,
      periodos: ['2026-1', '2025-2'],
      periodo_actual: req.query.periodo || '2026-1',
    }
  });
});

// ═══════════════════════════════════════
// RUTAS EXPEDIENTES
// ═══════════════════════════════════════
app.get('/api/expedientes', requireAuth, (req, res) => {
  const { carrera_id, grupo_id, riesgo } = req.query;
  let data = alumnos.map(a => {
    const carrera = carreras.find(c => c.id === a.carrera_id) || {};
    const grupo = grupos.find(g => g.id === a.grupo_id) || {};
    return {
      ...a,
      carrera_nombre: carrera.nombre || '', carrera_clave: carrera.clave || '',
      grupo_nombre: grupo.nombre || '', grupo_semestre: grupo.semestre || '',
    };
  });

  if (carrera_id) data = data.filter(a => a.carrera_id === parseInt(carrera_id));
  if (grupo_id) data = data.filter(a => a.grupo_id === parseInt(grupo_id));
  if (riesgo && riesgo !== 'todos') data = data.filter(a => a.nivel_riesgo === riesgo);

  res.json({ success: true, data, carreras, grupos });
});

app.get('/api/expedientes/:id', requireAuth, (req, res) => {
  const alumno = alumnos.find(a => a.id === parseInt(req.params.id));
  if (!alumno) return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
  const carrera = carreras.find(c => c.id === alumno.carrera_id) || {};
  const grupo = grupos.find(g => g.id === alumno.grupo_id) || {};
  res.json({ success: true, data: { ...alumno, carrera_nombre: carrera.nombre, grupo_nombre: grupo.nombre } });
});

// ═══════════════════════════════════════
// RUTAS CAPTURA
// ═══════════════════════════════════════
app.get('/api/captura/asignaciones', requireAuth, (req, res) => {
  const asignaciones = [
    { id: 1, grupo_id: 1, materia_id: 1, periodo: '2026-1', grupo_nombre: 'A', semestre: 9, carrera_clave: 'ISW', carrera_nombre: 'Ingeniería en Software', materia_nombre: 'Cálculo Diferencial', materia_clave: 'MAT-101', turno: 'matutino' },
    { id: 2, grupo_id: 1, materia_id: 2, periodo: '2026-1', grupo_nombre: 'A', semestre: 9, carrera_clave: 'ISW', carrera_nombre: 'Ingeniería en Software', materia_nombre: 'Prog. Orientada a Objetos', materia_clave: 'ISW-203', turno: 'matutino' },
  ];
  res.json({ success: true, data: asignaciones });
});

app.get('/api/captura/alumnos', requireAuth, (req, res) => {
  const { grupo_id } = req.query;
  const data = alumnos.filter(a => !grupo_id || a.grupo_id === parseInt(grupo_id));
  res.json({ success: true, data });
});

app.get('/api/captura/calificaciones', requireAuth, (req, res) => {
  const { grupo_id, materia_id } = req.query;
  const data = calificaciones.filter(c => (!grupo_id || c.grupo_id === parseInt(grupo_id)) && (!materia_id || c.materia_id === parseInt(materia_id)));
  res.json({ success: true, data });
});

app.post('/api/captura/guardar', requireAuth, (req, res) => {
  const { materia_id, parcial, registros } = req.body;
  if (!materia_id || !parcial || !registros) return res.status(400).json({ success: false, message: 'Datos incompletos' });

  registros.forEach(r => {
    const alumno = alumnos.find(a => a.id === r.alumno_id);
    if (!alumno) return;
    if (r.calificacion !== undefined && r.calificacion !== '') {
      alumno[`calificacion_p${parcial}`] = parseFloat(r.calificacion);
    }
    if (r.asistencia !== undefined && r.asistencia !== '') {
      alumno[`asistencia_p${parcial}`] = parseFloat(r.asistencia);
    }
    if (r.materias_reprobadas !== undefined) alumno.materias_reprobadas = parseInt(r.materias_reprobadas);
    if (r.parciales_reprobados !== undefined) alumno.parciales_reprobados = parseInt(r.parciales_reprobados);
    if (r.recursamiento !== undefined) alumno.recursamiento = parseInt(r.recursamiento);

    // Recalcular promedio y riesgo
    const cals = [alumno.calificacion_p1, alumno.calificacion_p2, alumno.calificacion_p3].filter(v => v !== null && v !== undefined);
    alumno.promedio_general = cals.length ? Math.round(cals.reduce((s, v) => s + v, 0) / cals.length * 10) / 10 : null;
    const asists = [alumno.asistencia_p1, alumno.asistencia_p2, alumno.asistencia_p3].filter(v => v !== null && v !== undefined);
    alumno.porcentaje_asistencia = asists.length ? Math.round(asists.reduce((s, v) => s + v, 0) / asists.length) : null;
    alumno.nivel_riesgo = calcRiesgo(alumno.promedio_general, alumno.porcentaje_asistencia);
  });

  res.json({ success: true, message: `${registros.length} registros guardados correctamente` });
});

// ═══════════════════════════════════════
// RUTAS ALERTAS
// ═══════════════════════════════════════
app.get('/api/alertas', requireAuth, (req, res) => {
  const data = alertas.map(a => {
    const alumno = alumnos.find(al => al.id === a.alumno_id) || {};
    return {
      ...a,
      alumno_nombre: `${alumno.nombre || ''} ${alumno.apellido_paterno || ''} ${alumno.apellido_materno || ''}`.trim(),
      carrera: alumno.carrera_id ? (carreras.find(c => c.id === alumno.carrera_id)?.clave || '') + ' ' + alumno.semestre + '°' : '',
    };
  });
  res.json({ success: true, data });
});

app.post('/api/alertas/:id/atender', requireAuth, (req, res) => {
  const alerta = alertas.find(a => a.id === parseInt(req.params.id));
  if (!alerta) return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
  alerta.estado = 'atendida';
  alerta.atendida_por = req.user.id;
  res.json({ success: true, message: 'Alerta atendida correctamente' });
});

// ═══════════════════════════════════════
// RUTAS USUARIOS
// ═══════════════════════════════════════
app.get('/api/usuarios', requireAuth, (req, res) => {
  const data = usuarios.map(({ password, ...u }) => u);
  res.json({ success: true, data });
});

app.post('/api/usuarios', requireAuth, (req, res) => {
  const { nombre, apellido, email, rol } = req.body;
  if (!nombre || !email) return res.status(400).json({ success: false, message: 'Nombre y correo requeridos' });
  const nuevo = { id: Date.now(), nombre, apellido: apellido || '', email, rol: rol || 'Docente', rol_id: 2, activo: true, password: 'Temp123!' };
  usuarios.push(nuevo);
  const { password, ...safe } = nuevo;
  res.json({ success: true, data: safe });
});

app.patch('/api/usuarios/:id/estado', requireAuth, (req, res) => {
  const user = usuarios.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  user.activo = !user.activo;
  res.json({ success: true, data: { activo: user.activo } });
});

// ═══════════════════════════════════════
// RUTAS ROLES
// ═══════════════════════════════════════
app.get('/api/roles', requireAuth, (req, res) => {
  res.json({ success: true, data: roles });
});

// ═══════════════════════════════════════
// RUTAS DOCENTES
// ═══════════════════════════════════════
app.get('/api/docentes', requireAuth, (req, res) => {
  res.json({ success: true, data: docentes });
});

app.post('/api/docentes', requireAuth, (req, res) => {
  const { nombre, departamento, materias: mats, grupo } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: 'Nombre requerido' });
  const nuevo = { id: Date.now(), nombre, departamento: departamento || '', materias: mats || '', grupo: grupo || '', grupo_color: '#6b7280' };
  docentes.push(nuevo);
  res.json({ success: true, data: nuevo });
});

app.delete('/api/docentes/:id', requireAuth, (req, res) => {
  const idx = docentes.findIndex(d => d.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Docente no encontrado' });
  docentes.splice(idx, 1);
  res.json({ success: true, message: 'Docente eliminado' });
});

// ═══════════════════════════════════════
// RUTAS REPORTES
// ═══════════════════════════════════════
app.get('/api/reportes/datos', requireAuth, (req, res) => {
  const riesgo = { critico: 0, alto: 0, medio: 0, bajo: 0 };
  alumnos.forEach(a => { if (riesgo[a.nivel_riesgo] !== undefined) riesgo[a.nivel_riesgo]++; });
  res.json({
    success: true,
    data: {
      total_alumnos: alumnos.length,
      riesgo,
      alumnos: alumnos.map(a => ({
        matricula: a.matricula,
        nombre: `${a.nombre} ${a.apellido_paterno}`,
        promedio_general: a.promedio_general,
        porcentaje_asistencia: a.porcentaje_asistencia,
        materias_reprobadas: a.materias_reprobadas,
        parciales_reprobados: a.parciales_reprobados,
        recursamiento: a.recursamiento,
        nivel_riesgo: a.nivel_riesgo,
      })),
      alertas_atendidas: alertas.filter(a => a.estado === 'atendida').length,
      alertas_pendientes: alertas.filter(a => a.estado === 'pendiente').length,
    }
  });
});

// ═══════════════════════════════════════
// CATALOGOS
// ═══════════════════════════════════════
app.get('/api/catalogos/grupos', requireAuth, (req, res) => res.json({ success: true, data: grupos }));
app.get('/api/catalogos/carreras', requireAuth, (req, res) => res.json({ success: true, data: carreras }));
app.get('/api/catalogos/materias', requireAuth, (req, res) => res.json({ success: true, data: materias }));

// ── Extra Alertas ──
app.put('/api/alertas/:id', requireAuth, (req, res) => {
  const alerta = alertas.find(a => a.id === parseInt(req.params.id));
  if (!alerta) return res.status(404).json({ success: false, message: 'No encontrada' });
  if (req.body.estado) alerta.estado = req.body.estado;
  if (req.body.notas_cierre !== undefined) alerta.notas_cierre = req.body.notas_cierre;
  res.json({ success: true, message: 'Alerta actualizada' });
});

app.post('/api/alertas/generar', requireAuth, (req, res) => {
  let nuevas = 0;
  alumnos.forEach(a => {
    const existe = alertas.find(al => al.alumno_id === a.id && al.estado === 'pendiente');
    if ((a.nivel_riesgo === 'critico' || a.nivel_riesgo === 'alto') && !existe) {
      alertas.push({ id: Date.now() + nuevas, alumno_id: a.id, nivel_riesgo: a.nivel_riesgo, motivo: a.nivel_riesgo === 'critico' ? 'Riesgo crítico detectado por modelo IA' : 'Riesgo alto detectado por modelo IA', tipo: 'Alerta IA', estado: 'pendiente', fecha: new Date().toISOString().slice(0,10) });
      nuevas++;
    }
  });
  res.json({ success: true, message: `${nuevas} alerta(s) generada(s)`, nuevas });
});

app.get('/api/alertas/count', requireAuth, (req, res) => {
  res.json({ success: true, count: alertas.filter(a => a.estado === 'pendiente').length });
});

// ── Extra Usuarios ──
app.get('/api/usuarios/:id', requireAuth, (req, res) => {
  const user = usuarios.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ success: false });
  const { password, ...safe } = user;
  res.json({ success: true, data: safe, roles: [{ id: 1, nombre: 'Administrador' }, { id: 2, nombre: 'Docente' }, { id: 3, nombre: 'Tutor' }] });
});

app.put('/api/usuarios/:id', requireAuth, (req, res) => {
  const user = usuarios.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ success: false });
  if (req.body.nombre) user.nombre = req.body.nombre;
  if (req.body.apellido !== undefined) user.apellido = req.body.apellido;
  if (req.body.email) user.email = req.body.email;
  if (req.body.rol) user.rol = req.body.rol;
  const { password, ...safe } = user;
  res.json({ success: true, data: safe });
});

app.delete('/api/usuarios/:id', requireAuth, (req, res) => {
  const idx = usuarios.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false });
  usuarios.splice(idx, 1);
  res.json({ success: true });
});

// Override /api/usuarios GET to include roles
const _usuariosGet = app._router.stack.find(r => r.route?.path === '/api/usuarios' && r.route?.methods?.get);

// ── Docentes tabs ──
app.get('/api/docentes/asignaciones', requireAuth, (req, res) => {
  const asignaciones = [
    { id: 1, docente_id: 2, docente_nombre: 'María Delgado', docente_email: 'maria.delgado@unipolidgo.edu.mx', grupo_id: 1, grupo_nombre: 'A', carrera_clave: 'ISW', semestre: 9, turno: 'matutino', materia_id: 1, materia_nombre: 'Cálculo Diferencial', materia_clave: 'MAT-101', periodo: '2026-1' },
    { id: 2, docente_id: 2, docente_nombre: 'María Delgado', docente_email: 'maria.delgado@unipolidgo.edu.mx', grupo_id: 1, grupo_nombre: 'A', carrera_clave: 'ISW', semestre: 9, turno: 'matutino', materia_id: 2, materia_nombre: 'Prog. Orientada a Objetos', materia_clave: 'ISW-203', periodo: '2026-1' },
  ];
  res.json({ success: true, data: asignaciones, docentes: usuarios.filter(u => u.rol === 'Docente').map(({ password, ...u }) => u), grupos, materias });
});

app.get('/api/docentes/tutorias', requireAuth, (req, res) => {
  const data = alumnos.map(a => {
    const carrera = carreras.find(c => c.id === a.carrera_id) || {};
    const grupo = grupos.find(g => g.id === a.grupo_id) || {};
    return { ...a, carrera_nombre: carrera.nombre, carrera_clave: carrera.clave, grupo_nombre: grupo.nombre, tutor_id: null, tutor_nombre: null };
  });
  const tutores = usuarios.filter(u => u.rol === 'Tutor' || u.rol === 'Docente').map(({ password, ...u }) => ({ ...u, nombre: u.nombre + ' ' + u.apellido, rol: u.rol }));
  res.json({ success: true, data, tutores });
});

app.post('/api/docentes/asignar-tutor', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Tutor asignado correctamente' });
});

app.delete('/api/docentes/asignaciones/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Asignación eliminada' });
});

// ── Reportes con preview ──
app.get('/api/reportes/preview', requireAuth, (req, res) => {
  const tipo = req.query.tipo || '';
  const nivel = req.query.nivel || '';
  const estado = req.query.estado || '';
  let titulo = '', columnas = [], data = [];

  if (tipo === 'riesgo') {
    titulo = 'Estudiantes en Riesgo';
    columnas = ['Matrícula', 'Alumno', 'Carrera', 'Semestre', 'Promedio', 'Asistencia %', 'Mat. Reprob.', 'Nivel Riesgo'];
    let fil = alumnos;
    if (nivel) fil = fil.filter(a => a.nivel_riesgo === nivel);
    data = fil.map(a => { const c = carreras.find(cc => cc.id === a.carrera_id) || {}; return [a.matricula, `${a.nombre} ${a.apellido_paterno}`, c.clave || '', a.semestre, a.promedio_general ?? 'N/A', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', a.materias_reprobadas ?? 0, { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }[a.nivel_riesgo] || 'Sin datos']; });
  } else if (tipo === 'alertas') {
    titulo = 'Alertas de Retención';
    columnas = ['Alumno', 'Tipo', 'Motivo', 'Nivel', 'Estado', 'Fecha'];
    let fil = alertas;
    if (estado) fil = fil.filter(a => a.estado === estado);
    data = fil.map(a => { const al = alumnos.find(x => x.id === a.alumno_id) || {}; return [`${al.nombre || ''} ${al.apellido_paterno || ''}`.trim(), a.tipo || 'Alerta IA', a.motivo, { critico: 'Crítico', alto: 'Alto', medio: 'Medio' }[a.nivel_riesgo] || a.nivel_riesgo, { pendiente: 'Pendiente', en_seguimiento: 'En seguimiento', atendida: 'Atendida', cerrada: 'Cerrada' }[a.estado] || a.estado, a.fecha]; });
  } else if (tipo === 'indicadores') {
    titulo = 'Indicadores Académicos';
    columnas = ['Matrícula', 'Alumno', 'Prom. P1', 'Prom. P2', 'Prom. P3', 'Asistencia %', 'Mat. Reprob.', 'Recursamiento'];
    data = alumnos.map(a => [a.matricula, `${a.nombre} ${a.apellido_paterno}`, a.calificacion_p1 ?? '-', a.calificacion_p2 ?? '-', a.calificacion_p3 ?? '-', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', a.materias_reprobadas ?? 0, a.recursamiento ? 'Sí' : 'No']);
  } else if (tipo === 'seguimiento') {
    titulo = 'Seguimientos';
    columnas = ['Alumno', 'Nivel Riesgo', 'Promedio', 'Asistencia', 'Estado'];
    data = alumnos.map(a => [`${a.nombre} ${a.apellido_paterno}`, a.nivel_riesgo, a.promedio_general ?? 'N/A', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', 'Activo']);
  }
  res.json({ success: true, titulo, columnas, data, total: data.length });
});

// ═══════════════════════════════════════
// RUTAS SUPABASE — Datos reales
// ═══════════════════════════════════════

// GET /api/supabase/status — verificar conexión
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

// GET /api/supabase/estudiantes — alumnos desde Supabase
app.get('/api/supabase/estudiantes', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado', data: [] });
  try {
    const { data, error } = await supabase
      .from('estudiantes')
      .select(`id, matricula, nombre, apellido_paterno, apellido_materno,
               email_institucional, estado_inscripcion, fecha_ingreso,
               carrera:carreras(nombre, clave_programa),
               resumen:resumen_academico(
                 promedio_actual, asistencia_promedio, materias_reprobadas,
                 parciales_reprobados, probabilidad_desercion, estado_riesgo
               )`)
      .eq('estado_inscripcion', 'activo')
      .limit(100);
    if (error) throw error;
    res.json({ success: true, data: data || [], total: data?.length || 0 });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

// GET /api/supabase/resumen — resumen académico con variables MDI
app.get('/api/supabase/resumen', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { periodoId } = req.query;
    let query = supabase
      .from('resumen_academico')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno,
               carrera:carreras(clave_programa))`)
      .order('probabilidad_desercion', { ascending: false })
      .limit(50);
    if (periodoId) query = query.eq('periodo_id', periodoId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

// GET /api/supabase/alertas — alertas desde Supabase
app.get('/api/supabase/alertas', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { data, error } = await supabase
      .from('alertas')
      .select(`*, estudiante:estudiantes(matricula, nombre, apellido_paterno,
               carrera:carreras(clave_programa))`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

// GET /api/supabase/periodos — periodos académicos
app.get('/api/supabase/periodos', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, data: [] });
  try {
    const { data, error } = await supabase
      .from('periodos_academicos')
      .select('*')
      .order('anio', { ascending: false })
      .order('numero', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (e) {
    res.json({ success: false, message: e.message, data: [] });
  }
});

// POST /api/supabase/calcular-resumen — recalcular resumen de un estudiante
app.post('/api/supabase/calcular-resumen', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ success: false, message: 'Supabase no configurado' });
  const { estudianteId, periodoId } = req.body;
  if (!estudianteId || !periodoId) return res.status(400).json({ success: false, message: 'estudianteId y periodoId requeridos' });
  try {
    const { error } = await supabase.rpc('fn_calcular_resumen', {
      p_estudiante_id: estudianteId,
      p_periodo_id: periodoId,
    });
    if (error) throw error;
    res.json({ success: true, message: 'Resumen calculado correctamente' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});

// ═══════════════════════════════════════
// NUEVAS RUTAS AGREGADAS
// ═══════════════════════════════════════

// PUT /api/alertas/:id - update estado + notas
app.put('/api/alertas/:id', requireAuth, (req, res) => {
  const alerta = alertas.find(a => a.id === parseInt(req.params.id));
  if (!alerta) return res.status(404).json({ success: false, message: 'No encontrada' });
  if (req.body.estado) alerta.estado = req.body.estado;
  if (req.body.notas_cierre !== undefined) alerta.notas_cierre = req.body.notas_cierre;
  res.json({ success: true, message: 'Alerta actualizada' });
});

// POST /api/alertas/generar - generate new alerts
app.post('/api/alertas/generar', requireAuth, (req, res) => {
  let nuevas = 0;
  alumnos.forEach(a => {
    if ((a.nivel_riesgo === 'critico' || a.nivel_riesgo === 'alto') && !alertas.find(al => al.alumno_id === a.id && al.estado === 'pendiente')) {
      alertas.push({ id: Date.now() + nuevas, alumno_id: a.id, nivel_riesgo: a.nivel_riesgo, motivo: `${a.nivel_riesgo === 'critico' ? 'Riesgo crítico detectado' : 'Riesgo alto detectado'} por modelo IA`, tipo: 'Alerta IA', estado: 'pendiente', fecha: new Date().toISOString().slice(0,10) });
      nuevas++;
    }
  });
  res.json({ success: true, message: `${nuevas} alerta(s) generada(s)`, nuevas });
});

// GET /api/alertas/count - count pending
app.get('/api/alertas/count', requireAuth, (req, res) => {
  res.json({ success: true, count: alertas.filter(a => a.estado === 'pendiente').length });
});

// PUT /api/usuarios/:id - edit user
app.put('/api/usuarios/:id', requireAuth, (req, res) => {
  const user = usuarios.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ success: false, message: 'No encontrado' });
  if (req.body.nombre) user.nombre = req.body.nombre;
  if (req.body.apellido !== undefined) user.apellido = req.body.apellido;
  if (req.body.email) user.email = req.body.email;
  if (req.body.rol) user.rol = req.body.rol;
  if (req.body.password) user.password = req.body.password;
  res.json({ success: true, data: { ...user, password: undefined } });
});

// DELETE /api/usuarios/:id - delete user
app.delete('/api/usuarios/:id', requireAuth, (req, res) => {
  const idx = usuarios.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false });
  usuarios.splice(idx, 1);
  res.json({ success: true });
});

// GET /api/usuarios/:id - get single user
app.get('/api/usuarios/:id', requireAuth, (req, res) => {
  const user = usuarios.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ success: false });
  const { password, ...safe } = user;
  res.json({ success: true, data: safe });
});

// GET /api/docentes/asignaciones - tab 1
app.get('/api/docentes/asignaciones', requireAuth, (req, res) => {
  const asignaciones = [
    { id: 1, docente_id: 2, docente_nombre: 'María Delgado', docente_email: 'maria.delgado@unipolidgo.edu.mx', grupo_id: 1, grupo_nombre: 'A', carrera_clave: 'ISW', semestre: 9, turno: 'matutino', materia_id: 1, materia_nombre: 'Cálculo Diferencial', materia_clave: 'MAT-101', periodo: '2026-1' },
    { id: 2, docente_id: 2, docente_nombre: 'María Delgado', docente_email: 'maria.delgado@unipolidgo.edu.mx', grupo_id: 1, grupo_nombre: 'A', carrera_clave: 'ISW', semestre: 9, turno: 'matutino', materia_id: 2, materia_nombre: 'Prog. Orientada a Objetos', materia_clave: 'ISW-203', periodo: '2026-1' },
  ];
  res.json({ success: true, data: asignaciones, docentes: [{ id: 2, nombre: 'María Delgado', email: 'maria.delgado@unipolidgo.edu.mx' }], grupos, materias });
});

// GET /api/docentes/tutorias - tab 2
app.get('/api/docentes/tutorias', requireAuth, (req, res) => {
  const data = alumnos.map(a => {
    const carrera = carreras.find(c => c.id === a.carrera_id) || {};
    const grupo = grupos.find(g => g.id === a.grupo_id) || {};
    return { ...a, carrera_nombre: carrera.nombre, carrera_clave: carrera.clave, grupo_nombre: grupo.nombre, tutor_id: null, tutor_nombre: null };
  });
  const tutores = usuarios.filter(u => u.rol === 'Tutor' || u.rol === 'Docente').map(({ password, ...u }) => u);
  res.json({ success: true, data, tutores });
});

// POST /api/docentes/asignar-tutor
app.post('/api/docentes/asignar-tutor', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Tutor asignado correctamente' });
});

// DELETE /api/docentes/asignaciones/:id
app.delete('/api/docentes/asignaciones/:id', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Asignación eliminada' });
});

// GET /api/reportes - generate report preview
app.get('/api/reportes', requireAuth, (req, res) => {
  const tipo = req.query.tipo;
  const nivel = req.query.nivel;
  const estado = req.query.estado;

  let titulo = '', columnas = [], data = [], total = 0;

  if (tipo === 'riesgo') {
    titulo = 'Estudiantes en Riesgo';
    columnas = ['Matrícula', 'Alumno', 'Carrera', 'Semestre', 'Promedio', 'Asistencia %', 'Mat. Reprob.', 'Nivel Riesgo'];
    let filtered = alumnos;
    if (nivel) filtered = filtered.filter(a => a.nivel_riesgo === nivel);
    data = filtered.map(a => {
      const carrera = carreras.find(c => c.id === a.carrera_id) || {};
      return [a.matricula, `${a.nombre} ${a.apellido_paterno}`, carrera.clave || '', a.semestre, a.promedio_general ?? 'N/A', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', a.materias_reprobadas ?? 0, { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }[a.nivel_riesgo] || 'Sin datos'];
    });
  } else if (tipo === 'alertas') {
    titulo = 'Alertas de Retención';
    columnas = ['Alumno', 'Tipo', 'Motivo', 'Nivel', 'Estado', 'Fecha'];
    let filtered = alertas;
    if (estado) filtered = filtered.filter(a => a.estado === estado);
    data = filtered.map(a => {
      const alumno = alumnos.find(al => al.id === a.alumno_id) || {};
      return [`${alumno.nombre || ''} ${alumno.apellido_paterno || ''}`.trim(), a.tipo || 'Alerta IA', a.motivo, { critico: 'Crítico', alto: 'Alto', medio: 'Medio' }[a.nivel_riesgo] || a.nivel_riesgo, { pendiente: 'Pendiente', en_seguimiento: 'En seguimiento', atendida: 'Atendida', cerrada: 'Cerrada' }[a.estado] || a.estado, a.fecha];
    });
  } else if (tipo === 'indicadores') {
    titulo = 'Indicadores Académicos';
    columnas = ['Matrícula', 'Alumno', 'Prom. P1', 'Prom. P2', 'Prom. P3', 'Asistencia %', 'Mat. Reprob.', 'Recursamiento'];
    data = alumnos.map(a => [a.matricula, `${a.nombre} ${a.apellido_paterno}`, a.calificacion_p1 ?? '-', a.calificacion_p2 ?? '-', a.calificacion_p3 ?? '-', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', a.materias_reprobadas ?? 0, a.recursamiento ? 'Sí' : 'No']);
  } else if (tipo === 'seguimiento') {
    titulo = 'Seguimientos';
    columnas = ['Alumno', 'Nivel Riesgo', 'Promedio', 'Asistencia', 'Estado'];
    data = alumnos.map(a => [`${a.nombre} ${a.apellido_paterno}`, a.nivel_riesgo, a.promedio_general ?? 'N/A', a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A', 'Activo']);
  }

  total = data.length;
  res.json({ success: true, titulo, columnas, data, total });
});

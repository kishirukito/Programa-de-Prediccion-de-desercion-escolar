import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

const nivelConfig = {
  critico:   { label: 'Crítico',   cls: 'badge badge-risk-critical badge-dot' },
  alto:      { label: 'Alto',      cls: 'badge badge-risk-high badge-dot'     },
  medio:     { label: 'Medio',     cls: 'badge badge-risk-medium badge-dot'   },
  bajo:      { label: 'Bajo',      cls: 'badge badge-risk-low badge-dot'      },
  sin_datos: { label: 'Sin datos', cls: 'badge badge-info badge-dot'          },
};

const nivelColor = {
  critico: 'var(--risk-critical)', alto: 'var(--risk-high)',
  medio: 'var(--risk-medium)',     bajo: 'var(--risk-low)',
  sin_datos: 'var(--gray-400)',
};

function indCls(val, type) {
  if (type === 'prom') {
    if (val == null) return '';
    // Promedio en escala 0-10
    return val < 6 ? 'danger' : val < 7 ? 'warning' : 'success';
  }
  if (type === 'asist') {
    if (val == null) return '';
    // Asistencia en porcentaje 0-100
    return val < 60 ? 'danger' : val < 80 ? 'warning' : 'success';
  }
  if (type === 'reprob') {
    return !val ? 'success' : val >= 3 ? 'danger' : 'warning';
  }
  return '';
}

/* ── Modal de expediente ── */
function ExpedienteModal({ alumno, onClose, onAnalizar, loadingDetalle }) {
  if (!alumno) return null;
  const [calculating, setCalculating] = React.useState(false);
  const [msg, setMsg] = React.useState('');

  const nivel = nivelConfig[alumno.nivel_riesgo] || nivelConfig.sin_datos;
  const color = nivelColor[alumno.nivel_riesgo] || 'var(--gray-400)';
  const ini = `${(alumno.nombre||'?')[0]}${(alumno.apellido_paterno||'?')[0]}`.toUpperCase();

  // Helper: muestra valor o 'Sin datos' si es null/undefined/0 para promedios
  const fmt = (v, tipo) => {
    if (v == null) return 'Sin datos';
    if (tipo === 'prom'  && v === 0) return 'Sin datos';
    if (tipo === 'asist') return `${v}%`;
    if (tipo === 'prom')  return typeof v === 'number' ? v.toFixed(1) : v;
    return v;
  };

  const vars = [
    { label: 'Promedio General',      value: fmt(alumno.promedio_general, 'prom'),             cls: alumno.promedio_general ? indCls(alumno.promedio_general, 'prom') : '' },
    { label: 'Asistencia %',          value: fmt(alumno.porcentaje_asistencia, 'asist'),        cls: alumno.porcentaje_asistencia != null ? indCls(alumno.porcentaje_asistencia, 'asist') : '' },
    { label: 'Materias Reprobadas',   value: alumno.materias_reprobadas ?? 0,                  cls: indCls(alumno.materias_reprobadas, 'reprob') },
    { label: 'Parciales Reprobados',  value: alumno.parciales_reprobados ?? 0,                 cls: indCls(alumno.parciales_reprobados, 'reprob') },
    { label: 'Recursamiento',         value: alumno.recursamiento ? `Sí (${alumno.num_recursamiento || 1})` : 'No', cls: alumno.recursamiento ? 'warning' : 'success' },
    { label: 'Calif. Mínima Parcial', value: fmt(alumno.calificacion_p1, 'prom'),              cls: alumno.calificacion_p1 ? indCls(alumno.calificacion_p1, 'prom') : '' },
    { label: 'Calif. Máxima Parcial', value: fmt(alumno.calificacion_p3, 'prom'),              cls: alumno.calificacion_p3 ? indCls(alumno.calificacion_p3, 'prom') : '' },
    { label: 'Calif. Parcial 2',      value: fmt(alumno.calificacion_p2, 'prom'),              cls: alumno.calificacion_p2 ? indCls(alumno.calificacion_p2, 'prom') : '' },
    { label: 'Asistencia Materia',    value: fmt(alumno.asistencia_p1, 'asist'),                cls: alumno.asistencia_p1 != null ? indCls(alumno.asistencia_p1, 'asist') : '' },
    { label: 'Prob. Deserción',       value: alumno.probabilidad_desercion != null ? `${Math.round(alumno.probabilidad_desercion * 100)}%` : 'Sin datos', cls: alumno.probabilidad_desercion > 0.7 ? 'danger' : alumno.probabilidad_desercion > 0.4 ? 'warning' : 'success' },
  ];

  const triggerIA = async () => {
    setCalculating(true);
    setMsg('');
    try {
      const res = await onAnalizar(alumno.id);
      if (res?.success) {
        setMsg(`Análisis completado: ${res.data.estado_riesgo === 'riesgo_critico' ? 'Crítico' : res.data.estado_riesgo === 'riesgo_moderado' ? 'Moderado' : res.data.estado_riesgo === 'alerta_temprana' ? 'Alerta Temprana' : 'Estable'}`);
      } else {
        setMsg(res?.message || 'Error al ejecutar análisis');
      }
    } catch (e) {
      setMsg('Error al conectar con el servidor');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 620 }}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">Expediente del Alumno</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Info principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', marginBottom: '1.25rem' }}>
            <div className="user-avatar" style={{ width: 52, height: 52, fontSize: '1rem', flexShrink: 0, background: `${color}22`, color }}>{ini}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>
                {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno || ''}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>
                Matrícula: <strong>{alumno.matricula}</strong> &nbsp;·&nbsp;
                {alumno.carrera_clave || '—'} &nbsp;·&nbsp;
                {alumno.semestre ? `${alumno.semestre}° Semestre` : ''} &nbsp;·&nbsp;
                Grupo {alumno.grupo_nombre || '—'}
              </div>
            </div>
            <span className={nivel.cls}>{nivel.label}</span>
          </div>

          {/* Variables IA */}
          {loadingDetalle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', marginBottom: '0.5rem', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Cargando datos detallados...
            </div>
          )}
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-700)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Variables Clave del Modelo IA
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
            {vars.map((v, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', padding: '0.625rem 0.875rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>{v.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: v.cls === 'danger' ? 'var(--danger)' : v.cls === 'warning' ? 'var(--warning)' : v.cls === 'success' ? 'var(--success)' : 'var(--gray-800)' }}>
                  {v.value}
                </div>
              </div>
            ))}
          </div>

          {/* Nivel de riesgo visual */}
          <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', background: `${color}11`, border: `1px solid ${color}44`, borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color }}>Nivel de Riesgo: {nivel.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: 2 }}>
                {alumno.nivel_riesgo === 'critico' && 'Requiere intervención urgente. Promedio crítico o asistencia muy baja.'}
                {alumno.nivel_riesgo === 'alto'    && 'Requiere atención. Indicadores por debajo del estándar mínimo.'}
                {alumno.nivel_riesgo === 'medio'   && 'Monitoreo recomendado. Algunos indicadores en zona de alerta.'}
                {alumno.nivel_riesgo === 'bajo'    && 'Desempeño adecuado. Sin indicadores de riesgo significativos.'}
                {alumno.nivel_riesgo === 'sin_datos' && 'Sin calificaciones o asistencias registradas aún.'}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--primary-600)' }}>{msg}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button 
              className="btn btn-primary" 
              onClick={triggerIA} 
              disabled={calculating} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              {calculating ? 'Analizando...' : 'Analizar con IA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ── */
export default function ExpedientesPage() {
  const [all, setAll]               = useState([]);
  const [carreras, setCarreras]     = useState([]);
  const [grupos, setGrupos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [buscar, setBuscar]         = useState('');
  const [filCarrera, setFilCarrera] = useState('');
  const [filGrupo, setFilGrupo]     = useState('');
  const [filNivel, setFilNivel]     = useState('todos');
  const [alumnoModal, setAlumnoModal] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const abrirExpediente = async (alumnoBase) => {
    setAlumnoModal(alumnoBase);
    setLoadingModal(true);
    try {
      const res = await api.expediente(alumnoBase.id);
      if (res?.success && res.data) {
        const d = res.data;
        // Merge explícito: solo campos del detalle que necesita el modal
        setAlumnoModal(prev => prev ? {
          ...alumnoBase,
          // Identidad
          nombre: d.nombre || alumnoBase.nombre,
          apellido_paterno: d.apellido_paterno || alumnoBase.apellido_paterno,
          apellido_materno: d.apellido_materno || alumnoBase.apellido_materno,
          matricula: d.matricula || alumnoBase.matricula,
          carrera_clave: d.carrera_clave || alumnoBase.carrera_clave,
          semestre: d.semestre || alumnoBase.semestre,
          // Riesgo — usar el del detalle solo si es distinto de sin_datos
          nivel_riesgo: (d.nivel_riesgo && d.nivel_riesgo !== 'sin_datos') ? d.nivel_riesgo : alumnoBase.nivel_riesgo,
          // Variables clave — del detalle
          promedio_general: d.promedio_general ?? alumnoBase.promedio_general,
          porcentaje_asistencia: d.porcentaje_asistencia ?? alumnoBase.porcentaje_asistencia,
          materias_reprobadas: d.materias_reprobadas ?? alumnoBase.materias_reprobadas,
          parciales_reprobados: d.parciales_reprobados ?? 0,
          recursamiento: d.recursamiento ?? false,
          num_recursamiento: d.num_recursamiento ?? 0,
          probabilidad_desercion: d.probabilidad_desercion,
          // Por parcial
          calificacion_p1: d.calificacion_p1 ?? null,
          calificacion_p2: d.calificacion_p2 ?? null,
          calificacion_p3: d.calificacion_p3 ?? null,
          asistencia_p1: d.asistencia_p1 ?? null,
          asistencia_p2: d.asistencia_p2 ?? null,
          asistencia_p3: d.asistencia_p3 ?? null,
        } : null);
      }
    } catch (e) {
      console.error('Error cargando expediente:', e);
    } finally {
      setLoadingModal(false);
    }
  };

  const cargar = async (nivel = filNivel) => {
    setLoading(true);
    try {
      const qs = `?riesgo=${nivel}${filCarrera ? `&carrera_id=${filCarrera}` : ''}${filGrupo ? `&grupo_id=${filGrupo}` : ''}`;
      const res = await api.expedientes(qs);
      if (res?.success) {
        setAll(res.data || []);
        setCarreras(res.carreras || []);
        setGrupos(res.grupos || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAnalizarIA = async (estudianteId) => {
    try {
      // Obtener el periodo_id real del alumno desde el objeto en memoria
      const alumno = all.find(x => x.id === estudianteId);
      // Usar el periodo del alumno si está disponible, si no intentar con el primer periodo activo
      const periodoId = alumno?.periodo_id || '00000000-0000-0000-0000-000000000030';

      const res = await api.supabaseCalcular(estudianteId, periodoId);

      if (res?.success) {
        // 1. Actualizar el modal inmediatamente con los datos de la predicción
        //    sin esperar el re-fetch completo
        setAlumnoModal(prev => prev ? {
          ...prev,
          nivel_riesgo: (() => {
            const m = { riesgo_critico: 'critico', riesgo_moderado: 'alto', alerta_temprana: 'medio', estable: 'bajo' };
            return m[res.data?.estado_riesgo] || prev.nivel_riesgo;
          })(),
          probabilidad_desercion: res.data?.probabilidad_desercion ?? prev.probabilidad_desercion,
        } : prev);

        // 2. Re-fetch en segundo plano para sincronizar la lista completa
        const qs = `?riesgo=${filNivel}${filCarrera ? `&carrera_id=${filCarrera}` : ''}${filGrupo ? `&grupo_id=${filGrupo}` : ''}`;
        api.expedientes(qs).then(refreshRes => {
          if (refreshRes?.success) {
            setAll(refreshRes.data || []);
            const updated = refreshRes.data.find(x => x.id === estudianteId);
            if (updated) setAlumnoModal(updated);
          }
        }).catch(() => {});
      }

      return res;
    } catch (err) {
      console.error('Error al invocar predicción IA:', err);
      throw err;
    }
  };

  const [analizandoTodos, setAnalizandoTodos] = useState(false);
  const [progresoBatch, setProgresoBatch]     = useState({ actual: 0, total: 0, errores: 0 });

  const handleAnalizarTodos = async () => {
    const lista = all.filter(a => a.periodo_id); // solo los que tienen periodo conocido
    if (!lista.length) return;
    setAnalizandoTodos(true);
    setProgresoBatch({ actual: 0, total: lista.length, errores: 0 });

    let errores = 0;
    for (let i = 0; i < lista.length; i++) {
      const alumno = lista[i];
      try {
        await api.supabaseCalcular(alumno.id, alumno.periodo_id);
      } catch (_) {
        errores++;
      }
      setProgresoBatch({ actual: i + 1, total: lista.length, errores });
    }

    // Re-fetch final para actualizar toda la lista
    const qs = `?riesgo=${filNivel}${filCarrera ? `&carrera_id=${filCarrera}` : ''}${filGrupo ? `&grupo_id=${filGrupo}` : ''}`;
    api.expedientes(qs).then(r => { if (r?.success) setAll(r.data || []); }).catch(() => {});
    setAnalizandoTodos(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = all.filter(a => {
    if (!buscar) return true;
    const t = buscar.toLowerCase();
    return `${a.nombre} ${a.apellido_paterno} ${a.matricula}`.toLowerCase().includes(t);
  });

  return (
    <div>
      <TopHeader title="Expedientes de Alumnos" />
      <div className="page-content">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="filter-bar">
              <select value={filCarrera} onChange={e => setFilCarrera(e.target.value)}>
                <option value="">Todas las carreras</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
              </select>
              <select value={filGrupo} onChange={e => setFilGrupo(e.target.value)}>
                <option value="">Todos los grupos</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.carrera_clave} {g.semestre}° &quot;{g.nombre}&quot;</option>)}
              </select>
              <select value={filNivel} onChange={e => { setFilNivel(e.target.value); cargar(e.target.value); }}>
                <option value="todos">Todos los niveles</option>
                <option value="critico">Crítico</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => cargar()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Filtrar
              </button>
            </div>
          </div>
          <div className="toolbar-right">
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar por nombre o matrícula..." value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>

            {/* Botón analizar todos */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAnalizarTodos}
              disabled={analizandoTodos || !all.length}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              {analizandoTodos ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {progresoBatch.actual}/{progresoBatch.total}
                  {progresoBatch.errores > 0 && ` · ${progresoBatch.errores} errores`}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Analizar todos con IA ({all.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Carrera / Grupo</th>
                    <th>Estatus de Riesgo</th>
                    <th>Variables Clave</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Cargando expedientes...</td></tr>
                  ) : filtrados.length === 0 ? (
                    <tr><td colSpan="5">
                      <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <h3>No hay expedientes</h3>
                        <p>No se encontraron alumnos con los filtros seleccionados</p>
                      </div>
                    </td></tr>
                  ) : filtrados.map((a, i) => {
                    const nivel  = nivelConfig[a.nivel_riesgo] || nivelConfig.sin_datos;
                    const prom   = a.promedio_general;
                    const asist  = a.porcentaje_asistencia;
                    const reprob = a.materias_reprobadas ?? 0;
                    const ini    = `${(a.nombre||'?')[0]}${(a.apellido_paterno||'?')[0]}`.toUpperCase();
                    return (
                      <tr key={a.id || i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.7rem' }}>{ini}</div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno} {a.apellido_materno||''}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.matricula}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', fontWeight: 500 }}>{a.carrera_clave || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {a.semestre ? `${a.semestre}° Sem` : ''}{a.grupo_nombre ? ` — Grupo ${a.grupo_nombre}` : ''}
                          </div>
                        </td>
                        <td><span className={nivel.cls}>{nivel.label}</span></td>
                        <td>
                          <div className="indicators">
                            <span className={`indicator${prom != null ? ` ${indCls(prom,'prom')}` : ''}`}>
                              Prom: <strong>{prom ?? 'N/A'}</strong>
                            </span>
                            <span className={`indicator${asist != null ? ` ${indCls(asist,'asist')}` : ''}`}>
                              Asist: <strong>{asist != null ? `${asist}%` : 'N/A'}</strong>
                            </span>
                            <span className={`indicator ${indCls(reprob,'reprob')}`}>
                              Reprob: <strong>{reprob}</strong>
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-600)' }}
                            onClick={() => abrirExpediente(a)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Ver Expediente
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Modal */}
      <ExpedienteModal alumno={alumnoModal} onClose={() => setAlumnoModal(null)} onAnalizar={handleAnalizarIA} loadingDetalle={loadingModal} />
    </div>
  );
}

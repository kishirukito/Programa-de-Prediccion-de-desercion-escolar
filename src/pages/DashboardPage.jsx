import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { PageLoader } from '../components/TableLoader';
import { api } from '../api';

/* ──────────────────────────────────────────
   CHARTS
────────────────────────────────────────── */
function RiskBarChart({ riesgo = {}, onSegmentClick }) {
  const segments = [
    { key: 'critico',   label: 'Crítico',   color: '#dc2626', bg: '#fef2f2' },
    { key: 'alto',      label: 'Alto',      color: '#f59e0b', bg: '#fffbeb' },
    { key: 'medio',     label: 'Medio',     color: '#3b82f6', bg: '#eff6ff' },
    { key: 'bajo',      label: 'Bajo',      color: '#22c55e', bg: '#f0fdf4' },
    { key: 'sin_datos', label: 'Sin datos', color: '#9ca3af', bg: '#f9fafb' },
  ].map(s => ({ ...s, value: riesgo[s.key] || 0 }));
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {segments.map((s, i) => {
        const pct = Math.round(s.value / total * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: s.value > 0 ? 'pointer' : 'default' }}
            onClick={() => s.value > 0 && onSegmentClick && onSegmentClick(s.key, s.label)}>
            <div style={{ width: 60, fontSize: 11, fontWeight: 600, color: s.color, textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
            <div style={{ flex: 1, height: 16, background: s.bg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width 0.6s ease', minWidth: s.value > 0 ? 3 : 0 }} />
              {s.value > 0 && pct > 8 && (
                <span style={{ position: 'absolute', left: `${Math.min(pct - 2, 80)}%`, top: '50%', transform: 'translateY(-50%) translateX(-100%)', fontSize: 10, fontWeight: 700, color: '#fff', paddingRight: 4 }}>{s.value}</span>
              )}
            </div>
            <div style={{ width: 30, fontSize: 10, color: 'var(--gray-400)', flexShrink: 0, textAlign: 'right' }}>{pct}%</div>
          </div>
        );
      })}
      <div style={{ marginTop: 4, padding: '5px 10px', background: 'var(--gray-50)', borderRadius: 6, textAlign: 'center', fontSize: 11, color: 'var(--gray-500)' }}>
        Total: <strong style={{ color: 'var(--gray-800)' }}>{total}</strong> alumnos registrados
      </div>
    </div>
  );
}

function AcademicBarsChart({ evolucion = [], onBarClick }) {
  if (!evolucion.length) return <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0', fontSize: 12 }}>Sin datos de calificaciones aún</div>;
  const W = 380, H = 140, padL = 30, padB = 22, padT = 8, padR = 12;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxAlumnos = Math.max(...evolucion.map(e => (e.aprobados || 0) + (e.reprobados || 0)), 1);
  const groupW = innerW / evolucion.length;
  const barW = Math.min(groupW * 0.22, 18);
  const gap = barW * 0.35;
  const yOf = v => padT + innerH - (Math.min(v, 100) / 100) * innerH;
  const yOfCnt = v => padT + innerH - (Math.min(v, maxAlumnos) / maxAlumnos) * innerH;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)} stroke="#f3f4f6" strokeWidth={1} />
            <text x={padL - 3} y={yOf(v) + 3} fontSize={8} fill="#9ca3af" textAnchor="end">{v}</text>
          </g>
        ))}
        {evolucion.map((e, gi) => {
          const cx = padL + gi * groupW + groupW / 2;
          const bars = [
            { v: e.promedio_general || 0, yFn: yOf,    color: '#3b82f6' },
            { v: e.aprobados  || 0,       yFn: yOfCnt, color: '#22c55e' },
            { v: e.reprobados || 0,       yFn: yOfCnt, color: '#ef4444' },
          ];
          const startX = cx - (3 * barW + 2 * gap) / 2;
          return (
            <g key={gi} style={{ cursor: 'pointer' }} onClick={() => onBarClick && onBarClick(e)}>
              {bars.map((b, bi) => {
                const bx = startX + bi * (barW + gap);
                const by = b.yFn(b.v);
                const bh = Math.max(padT + innerH - by, 2);
                return (
                  <g key={bi}>
                    <rect x={bx} y={by} width={barW} height={bh} fill={b.color} rx={2} opacity={0.88} />
                    {bh > 12 && <text x={bx + barW / 2} y={by + 9} fontSize={7} fill="#fff" textAnchor="middle" fontWeight={700}>{Math.round(b.v)}</text>}
                  </g>
                );
              })}
              <text x={cx} y={H - 4} fontSize={9} fill="#9ca3af" textAnchor="middle">Parcial {e.parcial}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
        {[{ color: '#3b82f6', label: 'Promedio' }, { color: '#22c55e', label: 'Aprobados' }, { color: '#ef4444', label: 'Reprobados' }].map((l, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#4b5563' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   MODALES
────────────────────────────────────────── */
const nivelColor = { critico: '#dc2626', alto: '#f59e0b', medio: '#3b82f6', bajo: '#22c55e', sin_datos: '#9ca3af' };
const nivelLabel = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_datos: 'Sin datos' };
const nivelCls   = { critico: 'badge badge-risk-critical badge-dot', alto: 'badge badge-risk-high badge-dot', medio: 'badge badge-risk-medium badge-dot', bajo: 'badge badge-risk-low badge-dot', sin_datos: 'badge badge-info badge-dot' };

function Modal({ title, onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* Modal: lista de alumnos por nivel de riesgo */
function ModalRiesgo({ nivelKey, alumnos, onClose }) {
  const color = nivelColor[nivelKey] || '#9ca3af';
  const label = nivelLabel[nivelKey] || nivelKey;
  const lista = alumnos.filter(a => a.nivel_riesgo === nivelKey);
  return (
    <Modal title={`Alumnos en Riesgo ${label}`} onClose={onClose} maxWidth={600}>
      {lista.length === 0
        ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '2rem' }}>No hay alumnos en este nivel.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map((a, i) => {
              const ini = `${(a.nombre||'?')[0]}${(a.apellido_paterno||'?')[0]}`.toUpperCase();
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', border: '1px solid var(--gray-100)', borderRadius: 'var(--border-radius)', background: '#fff' }}>
                  <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.7rem', background: `${color}22`, color, flexShrink: 0 }}>{ini}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{a.nombre} {a.apellido_paterno}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.matricula} · Prom: <strong>{a.promedio_general ?? 'N/A'}</strong> · Asist: <strong>{a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A'}</strong></div>
                  </div>
                  <span className={nivelCls[nivelKey] || 'badge badge-info badge-dot'}>{label}</span>
                </div>
              );
            })}
          </div>
      }
    </Modal>
  );
}

/* Modal: detalle de parcial */
function ModalParcial({ parcialData, onClose }) {
  if (!parcialData) return null;
  return (
    <Modal title={`Detalle — Parcial ${parcialData.parcial}`} onClose={onClose} maxWidth={480}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        {[
          { label: 'Total Alumnos',    value: parcialData.total_alumnos ?? '—', color: 'var(--primary-600)' },
          { label: 'Promedio General', value: parcialData.promedio_general != null ? parcialData.promedio_general.toFixed(1) : '—', color: '#3b82f6' },
          { label: 'Aprobados',        value: parcialData.aprobados ?? '—', color: 'var(--success)' },
          { label: 'Reprobados',       value: parcialData.reprobados ?? '—', color: 'var(--danger)' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
      {parcialData.promedio_general != null && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 6 }}>Tasa de aprobación</div>
          <div style={{ height: 12, background: 'var(--gray-100)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((parcialData.aprobados || 0) / ((parcialData.total_alumnos || 1)) * 100)}%`, background: 'var(--success)', borderRadius: 6, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4, textAlign: 'right' }}>
            {Math.round((parcialData.aprobados || 0) / ((parcialData.total_alumnos || 1)) * 100)}% aprobados
          </div>
        </div>
      )}
    </Modal>
  );
}

/* Modal: detalle de materia */
function ModalMateria({ materia, onClose }) {
  if (!materia) return null;
  const pct = materia.pct_reprobacion || 0;
  return (
    <Modal title={`Materia: ${materia.materia}`} onClose={onClose} maxWidth={460}>
      <div style={{ marginBottom: '1rem', padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius)', border: '1px solid var(--gray-200)' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{materia.materia}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>Clave: {materia.clave}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Alumnos', value: materia.total_alumnos, color: 'var(--primary-600)' },
          { label: 'Promedio',      value: materia.promedio,      color: materia.promedio < 70 ? 'var(--danger)' : 'var(--success)' },
          { label: 'Reprobados',    value: materia.reprobados,    color: 'var(--danger)' },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: 6 }}>
          <span>Porcentaje de reprobación</span>
          <strong style={{ color: pct >= 30 ? 'var(--danger)' : 'var(--warning)' }}>{pct}%</strong>
        </div>
        <div style={{ height: 10, background: '#fee2e2', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'var(--danger)', borderRadius: 6, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </Modal>
  );
}

/* Modal: estadísticas de asistencia */
function ModalAsistencia({ promedio, onClose }) {
  return (
    <Modal title="Asistencia Promedio" onClose={onClose} maxWidth={420}>
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: promedio >= 80 ? 'var(--success)' : promedio >= 60 ? 'var(--warning)' : 'var(--danger)', lineHeight: 1 }}>{promedio}%</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: 8 }}>Promedio general de asistencia del grupo</div>
        <div style={{ marginTop: '1.5rem', height: 14, background: 'var(--gray-100)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(promedio, 100)}%`, background: promedio >= 80 ? 'var(--success)' : promedio >= 60 ? 'var(--warning)' : 'var(--danger)', borderRadius: 8, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ marginTop: '1.5rem', padding: '0.875rem', borderRadius: 'var(--border-radius)', background: promedio >= 80 ? 'var(--success-bg)' : promedio >= 60 ? 'var(--warning-bg)' : 'var(--danger-bg)', border: `1px solid ${promedio >= 80 ? 'var(--success-border)' : promedio >= 60 ? 'var(--warning-border)' : 'var(--danger-border)'}` }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: promedio >= 80 ? 'var(--success)' : promedio >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
            {promedio >= 80 ? 'Asistencia satisfactoria' : promedio >= 60 ? 'Asistencia en zona de alerta' : 'Asistencia crítica — requiere atención'}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* Modal: alertas pendientes */
function ModalAlertas({ count, onClose }) {
  return (
    <Modal title="Alertas Pendientes" onClose={onClose} maxWidth={420}>
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: count > 0 ? '#7c3aed' : 'var(--success)', lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: 8 }}>alertas sin atender</div>
        {count > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '0.875rem', borderRadius: 'var(--border-radius)', background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>Acción recomendada</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Ve a la sección de Alertas para revisar y atender cada caso pendiente.</div>
          </div>
        )}
        {count === 0 && (
          <div style={{ marginTop: '1.5rem', padding: '0.875rem', borderRadius: 'var(--border-radius)', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>Sin alertas pendientes</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────────
   PÁGINA PRINCIPAL
────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [periodo, setPeriodo] = useState('');
  const [grupo, setGrupo]   = useState('');

  // Modales
  const [modalRiesgo,    setModalRiesgo]    = useState(null); // { key, label }
  const [modalParcial,   setModalParcial]   = useState(null); // parcialData
  const [modalMateria,   setModalMateria]   = useState(null); // materiaData
  const [modalAsistencia,setModalAsistencia]= useState(false);
  const [modalAlertas,   setModalAlertas]   = useState(false);
  const [modalEstudiantes,setModalEst]      = useState(false);

  const fetchData = async (periodoId = periodo) => {
    setLoading(true);
    setError(null);
    try {
      const params = [
        periodoId ? `periodo=${periodoId}` : '',
        grupo     ? `grupo_id=${grupo}`    : '',
      ].filter(Boolean).join('&');
      const res = await api.dashboard(params ? `?${params}` : '');
      if (res?.success) {
        setData(res);
        // If no period selected yet, default to the first period returned by the API
        if (!periodoId && res.filtros?.periodo_actual) {
          setPeriodo(res.filtros.periodo_actual);
        }
      } else {
        setError(res?.message || 'No se pudieron cargar los datos.');
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const d      = data?.data || {};
  const filtros = data?.filtros || {};
  const alumnos = d.alumnos_riesgo_recientes || [];

  const statCards = [
    {
      label: 'ESTUDIANTES REGISTRADOS', value: d.total_estudiantes ?? '—', sub: 'Alumnos activos',
      color: 'var(--primary-600)', bg: 'var(--primary-50)',
      onClick: () => setModalEst(true),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      label: 'RIESGO ALTO', value: d.riesgo?.alto ?? '—', sub: 'Requieren atención',
      color: '#ea580c', bg: '#fff7ed',
      onClick: () => setModalRiesgo({ key: 'alto', label: 'Alto' }),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    },
    {
      label: 'RIESGO CRÍTICO', value: d.riesgo?.critico ?? '—', sub: 'Intervención urgente',
      color: '#dc2626', bg: '#fef2f2',
      onClick: () => setModalRiesgo({ key: 'critico', label: 'Crítico' }),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    },
    {
      label: 'ASISTENCIA PROMEDIO', value: d.promedio_asistencia != null ? `${d.promedio_asistencia}%` : '—', sub: 'Porcentaje general',
      color: '#16a34a', bg: '#f0fdf4',
      onClick: () => setModalAsistencia(true),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    {
      label: 'ALERTAS PENDIENTES', value: d.alertas_pendientes ?? '—', sub: 'Por atender',
      color: '#7c3aed', bg: '#f5f3ff',
      onClick: () => setModalAlertas(true),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    },
  ];

  return (
    <div>
      <TopHeader title="Dashboard" />
      <div className="page-content">

        {/* Filtros */}
        <div className="dashboard-filters">
          <div className="filter-group">
            <label>PERIODO</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
              <option value="">Todos los periodos</option>
              {(filtros.periodos || []).map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>GRUPO</label>
            <select value={grupo} onChange={e => setGrupo(e.target.value)}>
              <option value="">Todos los grupos</option>
              {(filtros.grupos || []).map(g => (
                <option key={g.id} value={g.id}>{g.carrera_clave} {g.semestre}° &quot;{g.nombre}&quot;</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => fetchData()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualizar
          </button>
        </div>

        {error && (
          <div style={{ margin: '1rem 0', padding: '0.875rem 1rem', borderRadius: 'var(--border-radius)', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {loading ? (
          <PageLoader text="Cargando dashboard..." />
        ) : (
          <>
            {/* Stat cards — clickeables */}
            <div className="stats-grid stats-grid-5">
              {statCards.map((c, i) => (
                <div key={i} className="stat-card" onClick={c.onClick}
                  style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div className="stat-header">
                    <span className="stat-label">{c.label}</span>
                    <div className="stat-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                  </div>
                  <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
                  <div className="stat-desc">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="dashboard-charts-row" style={{ marginTop: '1rem', alignItems: 'stretch' }}>
              <div className="card chart-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <div className="chart-title" style={{ marginBottom: '0.75rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  Distribución de Niveles de Riesgo
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 400 }}>Clic para ver alumnos</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <RiskBarChart riesgo={d.riesgo} onSegmentClick={(key, label) => setModalRiesgo({ key, label })} />
                </div>
              </div>
              <div className="card chart-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <div className="chart-title" style={{ marginBottom: '0.75rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Evolución del Rendimiento por Parcial
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 400 }}>Clic para ver detalle</span>
                </div>
                <div style={{ flex: 1 }}>
                  <AcademicBarsChart evolucion={d.evolucion_rendimiento} onBarClick={e => setModalParcial(e)} />
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="dashboard-bottom-row" style={{ marginTop: '1rem' }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="chart-title" style={{ margin: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Materias con Mayor Reprobación
                  </h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Materia</th><th>Alumnos</th><th>Promedio</th><th>Reprobados</th><th>% Repro.</th></tr>
                      </thead>
                      <tbody>
                        {(d.materias_reprobacion || []).length === 0
                          ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Sin datos</td></tr>
                          : (d.materias_reprobacion || []).map((m, i) => (
                            <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setModalMateria(m)}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}>
                              <td>
                                <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{m.materia}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{m.clave}</div>
                              </td>
                              <td>{m.total_alumnos}</td>
                              <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{m.promedio}</td>
                              <td>{m.reprobados}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 4, background: '#fee2e2', borderRadius: 2, minWidth: 40 }}>
                                    <div style={{ width: `${Math.min(m.pct_reprobacion, 100)}%`, height: '100%', background: 'var(--danger)', borderRadius: 2 }} />
                                  </div>
                                  <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{m.pct_reprobacion}%</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="chart-title" style={{ margin: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Alumnos en Riesgo Recientes
                  </h3>
                </div>
                <div className="card-body">
                  {alumnos.length === 0
                    ? <div className="empty-state"><p>Sin alumnos en riesgo</p></div>
                    : alumnos.map((a, i) => {
                      const nk = a.nivel_riesgo || 'sin_datos';
                      const color = nivelColor[nk] || '#9ca3af';
                      const ini = `${(a.nombre||'?')[0]}${(a.apellido_paterno||'?')[0]}`.toUpperCase();
                      return (
                        <div key={i} className="risk-student-item" style={{ cursor: 'pointer' }}
                          onClick={() => setModalRiesgo({ key: nk, label: nivelLabel[nk] || nk })}>
                          <div className="risk-student-info">
                            <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.7rem', background: `${color}22`, color }}>{ini}</div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{a.nombre} {a.apellido_paterno}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.matricula} — Prom: {a.promedio_general ?? 'N/A'}</div>
                            </div>
                          </div>
                          <span className={nivelCls[nk] || 'badge badge-info badge-dot'}>{nivelLabel[nk] || nk}</span>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modales ── */}
      {modalRiesgo && (
        <ModalRiesgo nivelKey={modalRiesgo.key} alumnos={d.alumnos_riesgo_recientes || []} onClose={() => setModalRiesgo(null)} />
      )}
      {modalParcial && (
        <ModalParcial parcialData={modalParcial} onClose={() => setModalParcial(null)} />
      )}
      {modalMateria && (
        <ModalMateria materia={modalMateria} onClose={() => setModalMateria(null)} />
      )}
      {modalAsistencia && (
        <ModalAsistencia promedio={d.promedio_asistencia ?? 0} onClose={() => setModalAsistencia(false)} />
      )}
      {modalAlertas && (
        <ModalAlertas count={d.alertas_pendientes ?? 0} onClose={() => setModalAlertas(false)} />
      )}
      {modalEstudiantes && (
        <Modal title="Estudiantes Registrados" onClose={() => setModalEst(false)} maxWidth={460}>
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--primary-600)', lineHeight: 1 }}>{d.total_estudiantes ?? 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: 8 }}>alumnos activos registrados</div>
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem' }}>
              {Object.entries(d.riesgo || {}).map(([key, count]) => (
                <div key={key} style={{ padding: '0.75rem', border: `1px solid ${nivelColor[key] || '#e5e7eb'}44`, borderRadius: 'var(--border-radius)', background: `${nivelColor[key] || '#9ca3af'}11` }}>
                  <div style={{ fontSize: '0.7rem', color: nivelColor[key] || 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>{nivelLabel[key] || key}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: nivelColor[key] || 'var(--gray-800)' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

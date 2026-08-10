import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

/* ── helpers ── */
function diagIA(c) {
  const v = parseFloat(c);
  if (isNaN(v) || c === '') return '—';
  if (v < 60) return 'Crítico';
  if (v < 70) return 'Alto';
  if (v < 85) return 'Regular';
  return 'Bajo Riesgo';
}
function diagCls(d) {
  if (d === 'Crítico') return 'badge badge-risk-critical';
  if (d === 'Alto')    return 'badge badge-risk-high';
  if (d === 'Regular') return 'badge badge-risk-medium';
  if (d === 'Bajo Riesgo') return 'badge badge-risk-low';
  return 'badge';
}

/* días entre dos fechas */
function dateRange(from, to) {
  const days = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

/* ── Componente General (sólo lectura) ── */
function TabGeneral({ alumnos, loading }) {
  if (loading) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Cargando...</p>;
  if (!alumnos.length) return <div className="empty-state"><p>Selecciona un grupo para ver los alumnos.</p></div>;
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Alumno</th>
            <th>Matrícula</th>
            <th>Carrera</th>
            <th>Promedio</th>
            <th>Asistencia</th>
            <th>Nivel Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map(a => {
            const nCls = { critico:'badge badge-risk-critical badge-dot', alto:'badge badge-risk-high badge-dot', medio:'badge badge-risk-medium badge-dot', bajo:'badge badge-risk-low badge-dot', sin_datos:'badge badge-info badge-dot' }[a.nivel_riesgo] || 'badge badge-info badge-dot';
            const nLbl = { critico:'Crítico', alto:'Alto', medio:'Medio', bajo:'Bajo', sin_datos:'Sin datos' }[a.nivel_riesgo] || '—';
            return (
              <tr key={a.id}>
                <td><div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno}</div></td>
                <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{a.matricula}</td>
                <td style={{ color: 'var(--gray-600)', fontSize: '0.8rem' }}>{a.carrera_clave || '—'} {a.semestre ? `${a.semestre}°` : ''}</td>
                <td style={{ fontWeight: 600, color: a.promedio_general < 70 ? 'var(--danger)' : 'var(--success)' }}>{a.promedio_general ?? 'N/A'}</td>
                <td>{a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : 'N/A'}</td>
                <td><span className={nCls}>{nLbl}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Componente Calificaciones ── */
function TabCalificaciones({ alumnos, loading, numParciales, setNumParciales }) {
  const [notas, setNotas] = useState({});
  const [parcial, setParcial] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Si parcial activo > numParciales, ajustar
  useEffect(() => {
    if (parcial > numParciales) setParcial(numParciales);
  }, [numParciales]);

  const upd = (id, val) => setNotas(p => ({ ...p, [id]: { ...p[id], [parcial]: val } }));
  const get = (id) => notas[id]?.[parcial] ?? '';

  const guardar = async () => {
    setSaving(true);
    try {
      const registros = alumnos.map(a => ({ alumno_id: a.id, calificacion: get(a.id) })).filter(r => r.calificacion !== '');
      if (registros.length > 0) {
        await api.guardarCaptura({ parcial, registros });
      }
      setMsg(`Parcial ${parcial} guardado correctamente`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg('Error al guardar');
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  };

  if (loading) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
        
        {/* Número total de parciales - select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            TOTAL DE PARCIALES:
          </label>
          <select
            value={numParciales}
            onChange={e => setNumParciales(parseInt(e.target.value))}
            style={{ padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', color: 'var(--gray-700)', background: '#fff' }}
          >
            {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} parciales</option>)}
          </select>
        </div>

        {/* Parcial a capturar - select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            CAPTURANDO:
          </label>
          <select
            value={parcial}
            onChange={e => setParcial(parseInt(e.target.value))}
            style={{ padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', color: 'var(--gray-700)', background: '#fff' }}
          >
            {Array.from({ length: numParciales }, (_, i) => i + 1).map(p => (
              <option key={p} value={p}>Parcial {p}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {msg && <span style={{ fontSize: '0.85rem', color: msg.includes('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{msg}</span>}
          <button className={`btn btn-primary${saving ? ' loading' : ''}`} onClick={guardar} disabled={saving || !alumnos.length}>
            {saving ? 'Guardando...' : `Guardar Parcial ${parcial}`}
          </button>
        </div>
      </div>

      {!alumnos.length ? <div className="empty-state"><p>Selecciona un grupo.</p></div> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th style={{ textAlign: 'center' }}>Calificación — Parcial {parcial}</th>
                <th style={{ textAlign: 'center' }}>Diagnóstico IA</th>
                {Array.from({ length: numParciales }, (_, i) => i + 1).filter(p => p !== parcial).map(p => (
                  <th key={p} style={{ textAlign: 'center', color: 'var(--gray-400)', fontWeight: 500 }}>P{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumnos.map(a => {
                const val = get(a.id);
                const diag = diagIA(val);
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.matricula}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" className="grade-input" min="0" max="100" step="0.1"
                        value={val} placeholder="—"
                        onChange={e => upd(a.id, e.target.value)}
                        style={{ textAlign: 'center', width: 80 }} />
                    </td>
                    <td style={{ textAlign: 'center' }}><span className={diagCls(diag)}>{diag}</span></td>
                    {Array.from({ length: numParciales }, (_, i) => i + 1).filter(p => p !== parcial).map(p => (
                      <td key={p} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                        {notas[a.id]?.[p] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Componente Asistencias ── */
function TabAsistencias({ alumnos, loading, numParciales }) {

  // Generar rangos automáticamente según numParciales
  // Sep-Dic 2026 dividido en numParciales partes iguales
  const generarRangos = (n) => {
    const inicio = new Date('2026-09-01');
    const fin    = new Date('2026-12-12');
    const totalDias = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
    const diasPorParcial = Math.floor(totalDias / n);
    return Array.from({ length: n }, (_, i) => {
      const desde = new Date(inicio);
      desde.setDate(inicio.getDate() + i * diasPorParcial);
      const hasta = i === n - 1 ? new Date(fin) : new Date(inicio);
      if (i < n - 1) hasta.setDate(inicio.getDate() + (i + 1) * diasPorParcial - 1);
      return {
        label: `Parcial ${i + 1}`,
        desde: desde.toISOString().slice(0, 10),
        hasta: hasta.toISOString().slice(0, 10),
      };
    });
  };

  const [rangos, setRangos]         = useState(() => generarRangos(numParciales));
  const [showConfig, setShowConfig] = useState(false);
  const [asist, setAsist]           = useState({});
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  // Cuando cambia numParciales, regenerar rangos
  useEffect(() => {
    setRangos(generarRangos(numParciales));
  }, [numParciales]);

  const toggle = (alumnoId, fecha) => {
    setAsist(prev => {
      const cur = prev[alumnoId]?.[fecha];
      const next = cur === undefined ? 'P' : cur === 'P' ? 'A' : cur === 'A' ? 'J' : undefined;
      const updated = { ...prev[alumnoId], [fecha]: next };
      if (next === undefined) delete updated[fecha];
      return { ...prev, [alumnoId]: updated };
    });
  };

  const getVal = (alumnoId, fecha) => asist[alumnoId]?.[fecha];

  const guardar = async () => {
    setSaving(true);
    try {
      const registros = [];
      alumnos.forEach(a => {
        Object.entries(asist[a.id] || {}).forEach(([fecha, estado]) => {
          registros.push({
            alumno_id: a.id,
            fecha,
            estado: estado === 'P' ? 'presente' : estado === 'A' ? 'ausente' : 'justificado'
          });
        });
      });
      if (registros.length > 0) {
        await api.guardarCaptura({ tipo: 'asistencias', registros });
      }
      setMsg(`Asistencias guardadas: ${registros.length} registros`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setMsg('Error al guardar');
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  };

  // Calcular todos los días de todos los parciales
  const parcialDias = rangos.map(r => ({
    ...r,
    dias: dateRange(r.desde, r.hasta).filter(d => d.getDay() !== 0 && d.getDay() !== 6),
  }));

  const totalDias = parcialDias.reduce((s, p) => s + p.dias.length, 0);

  if (loading) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          Cuatrimestre <strong>Sep — Dic 2026</strong> · {totalDias} días hábiles · {rangos.length} parciales
        </span>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(!showConfig)}>
          Configurar rangos de parciales
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {msg && <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{msg}</span>}
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
            {[['P','Presente','var(--success)'],['A','Ausente','var(--danger)'],['J','Justificado','var(--warning)']].map(([k,l,c]) => (
              <span key={k} style={{ display:'flex', alignItems:'center', gap:3, color:'var(--gray-500)' }}>
                <span style={{ width:14, height:14, borderRadius:3, background:`${c}22`, border:`1px solid ${c}`, display:'inline-block', fontWeight:700, fontSize:9, color:c, lineHeight:'14px', textAlign:'center' }}>{k}</span>{l}
              </span>
            ))}
          </div>
          <button className={`btn btn-primary${saving ? ' loading' : ''}`} onClick={guardar} disabled={saving || !alumnos.length}>
            {saving ? 'Guardando...' : 'Guardar Asistencias'}
          </button>
        </div>
      </div>

      {/* Config rangos */}
      {showConfig && (
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', margin: '1rem 1.25rem', padding: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>Rangos de Parciales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rangos.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-600)', minWidth: 72 }}>{r.label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Desde:</span>
                <input type="date" value={r.desde} onChange={e => setRangos(prev => prev.map((x,j) => j===i ? {...x, desde: e.target.value} : x))}
                  style={{ padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Hasta:</span>
                <input type="date" value={r.hasta} onChange={e => setRangos(prev => prev.map((x,j) => j===i ? {...x, hasta: e.target.value} : x))}
                  style={{ padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  ({dateRange(r.desde, r.hasta).filter(d => d.getDay() !== 0 && d.getDay() !== 6).length} días hábiles)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!alumnos.length ? <div className="empty-state"><p>Selecciona un grupo.</p></div> : (
        <div style={{ overflowX: 'auto', padding: '0 1.25rem 1.25rem' }}>
          <table className="asist-calendar">
            <thead>
              {/* Fila: parciales */}
              <tr>
                <th className="alumno-cell" rowSpan={2} style={{ minWidth: 160 }}>Alumno</th>
                {parcialDias.map((p, pi) => (
                  <th key={pi} colSpan={p.dias.length} className="parcial-header" style={{ textAlign: 'center', background: `hsl(${220 + pi*40},70%,95%)`, color: `hsl(${220 + pi*40},60%,35%)` }}>
                    {p.label} ({p.dias.length}d)
                  </th>
                ))}
                <th style={{ textAlign: 'center', minWidth: 60, background: 'var(--gray-50)' }}>% Asist.</th>
              </tr>
              {/* Fila: fechas */}
              <tr>
                {parcialDias.map(p => p.dias.map(d => (
                  <th key={d.toISOString()} style={{ minWidth: 28, fontSize: '0.6rem', fontWeight: 500, color: 'var(--gray-500)', padding: '3px 2px', textAlign: 'center' }}>
                    <div>{DIAS[d.getDay()]}</div>
                    <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{d.getDate()}</div>
                    <div style={{ color: 'var(--gray-400)' }}>{MESES[d.getMonth()]}</div>
                  </th>
                )))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map(a => {
                const allDias = parcialDias.flatMap(p => p.dias);
                const total = allDias.length;
                const presentes = allDias.filter(d => {
                  const k = d.toISOString().slice(0,10);
                  return asist[a.id]?.[k] === 'P' || asist[a.id]?.[k] === 'J';
                }).length;
                const pct = total > 0 ? Math.round(presentes / total * 100) : 0;
                return (
                  <tr key={a.id}>
                    <td className="alumno-cell">
                      <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{a.matricula}</div>
                    </td>
                    {parcialDias.map(p => p.dias.map(d => {
                      const k = d.toISOString().slice(0,10);
                      const v = getVal(a.id, k);
                      return (
                        <td key={k}>
                          <button className={`asist-btn ${v || 'none'}`} onClick={() => toggle(a.id, k)} title={k}>
                            {v || '·'}
                          </button>
                        </td>
                      );
                    }))}
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Página principal ── */
export default function CapturPage() {
  const [tab, setTab]             = useState('general');
  const [asignaciones, setAsigs]  = useState([]);
  const [asignacionId, setAsigId] = useState('');
  const [alumnos, setAlumnos]     = useState([]);
  const [loadingAsi, setLoadAsi]  = useState(true);
  const [loadingAl, setLoadAl]    = useState(false);
  const [numParciales, setNumP]   = useState(3);

  useEffect(() => {
    api.asignaciones()
      .then(r => setAsigs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => {})
      .finally(() => setLoadAsi(false));
  }, []);

  useEffect(() => {
    if (!asignacionId) { setAlumnos([]); return; }
    const asi = asignaciones.find(a => String(a.id) === String(asignacionId));
    if (!asi) return;
    setLoadAl(true);
    api.alumnosGrupo(asi.grupo_id)
      .then(r => setAlumnos(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => {})
      .finally(() => setLoadAl(false));
  }, [asignacionId]);

  const asgn     = asignaciones.find(a => String(a.id) === String(asignacionId));
  const grupoLbl = asgn ? `${asgn.carrera_clave||''} ${asgn.semestre||''}° "${asgn.grupo_nombre||''}"` : '';

  const TABS = [
    { id: 'general',        label: 'General'        },
    { id: 'calificaciones', label: 'Calificaciones' },
    { id: 'asistencias',    label: 'Asistencias'    },
  ];

  return (
    <div>
      <TopHeader title="Captura de Calificaciones" />
      <div className="page-content">

        {/* Filtros de grupo */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-700)' }}>Filtros de Captura Docente</span>
          </div>
          <div className="card-body">
            {loadingAsi ? (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Cargando asignaciones...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group no-icon" style={{ marginBottom: 0 }}>
                  <label>MATERIA / GRUPO</label>
                  <select value={asignacionId} onChange={e => setAsigId(e.target.value)}>
                    <option value="">Seleccionar asignación...</option>
                    {asignaciones.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.materia_nombre || a.materia} ({a.materia_clave || ''}) — {a.carrera_clave} {a.semestre}° "{a.grupo_nombre}"
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group no-icon" style={{ marginBottom: 0 }}>
                  <label>GRUPO SELECCIONADO</label>
                  <input type="text" value={grupoLbl} readOnly placeholder="—"
                    style={{ background: 'var(--gray-50)', cursor: 'default' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card con tabs */}
        <div className="card">
          {/* Tabs */}
          <div className="captura-tabs">
            {TABS.map(t => (
              <button key={t.id}
                className={`captura-tab-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {tab === 'general' && (
            <TabGeneral alumnos={alumnos} loading={loadingAl} />
          )}
          {tab === 'calificaciones' && (
            <TabCalificaciones
              alumnos={alumnos}
              loading={loadingAl}
              numParciales={numParciales}
              setNumParciales={setNumP}
            />
          )}
          {tab === 'asistencias' && (
            <TabAsistencias alumnos={alumnos} loading={loadingAl} numParciales={numParciales} />
          )}
        </div>

      </div>
    </div>
  );
}

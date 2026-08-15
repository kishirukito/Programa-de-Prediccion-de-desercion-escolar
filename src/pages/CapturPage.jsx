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

/* ── Componente General (cálculo en tiempo real) ── */
function TabGeneral({ grupoId, materiaId, periodoId }) {
  const [filas, setFilas]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!grupoId || !periodoId) { setFilas([]); return; }
    setLoading(true);
    setError(null);
    api.resumenGrupo(grupoId, materiaId, periodoId)
      .then(r => setFilas(r?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [grupoId, materiaId, periodoId]);

  if (loading) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Calculando...</p>;
  if (error)   return <p style={{ padding: '2rem', color: 'var(--danger)',   textAlign: 'center' }}>{error}</p>;
  if (!filas.length) return <div className="empty-state"><p>Selecciona un grupo para ver los alumnos.</p></div>;

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Alumno</th>
            <th>Matrícula</th>
            <th>Carrera</th>
            <th>Promedio Materia</th>
            <th>Asistencia Materia</th>
            <th>Nivel Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(a => {
            const nCls = {
              critico:   'badge badge-risk-critical badge-dot',
              alto:      'badge badge-risk-high badge-dot',
              medio:     'badge badge-risk-medium badge-dot',
              bajo:      'badge badge-risk-low badge-dot',
              sin_datos: 'badge badge-info badge-dot',
            }[a.nivel_riesgo] || 'badge badge-info badge-dot';
            const nLbl = { critico:'Crítico', alto:'Alto', medio:'Medio', bajo:'Bajo', sin_datos:'Sin datos' }[a.nivel_riesgo] || '—';
            const promColor = a.promedio_materia == null ? 'var(--gray-400)'
              : a.promedio_materia < 7 ? 'var(--danger)' : 'var(--success)';
            const asistColor = a.porcentaje_asistencia == null ? 'var(--gray-400)'
              : a.porcentaje_asistencia < 75 ? 'var(--danger)'
              : a.porcentaje_asistencia < 85 ? 'var(--warning)' : 'var(--success)';
            return (
              <tr key={a.id}>
                <td><div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno}</div></td>
                <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{a.matricula}</td>
                <td style={{ color: 'var(--gray-600)', fontSize: '0.8rem' }}>{a.carrera_clave} {a.semestre ? `${a.semestre}°` : ''}</td>
                <td style={{ fontWeight: 700, color: promColor }}>
                  {a.promedio_materia != null ? a.promedio_materia.toFixed(1) : <span style={{ color: 'var(--gray-300)' }}>Sin datos</span>}
                </td>
                <td style={{ fontWeight: 600, color: asistColor }}>
                  {a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : <span style={{ color: 'var(--gray-300)' }}>Sin datos</span>}
                </td>
                <td><span className={nCls}>{nLbl}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-100)' }}>
        {filas.length} alumnos · <strong>Promedio Materia</strong>: media de los parciales de la materia seleccionada · <strong>Asistencia</strong>: de la materia seleccionada · El promedio general en Expedientes considera todas las materias del alumno
      </div>
    </div>
  );
}

/* ── Componente Calificaciones ── */
function TabCalificaciones({ alumnos, loading, numParciales, setNumParciales, materiaId, periodoId }) {
  const [notas, setNotas] = useState({});
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [parcial, setParcial] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Cargar calificaciones existentes cuando cambia materia o periodo
  useEffect(() => {
    if (!materiaId) { setNotas({}); return; }
    setLoadingNotas(true);
    api.calificacionesMateria(materiaId, periodoId)
      .then(r => {
        const map = {};
        (r?.data || []).forEach(c => {
          map[c.estudiante_id] = {
            1: c.parcial_1 ?? '',
            2: c.parcial_2 ?? '',
            3: c.parcial_3 ?? '',
          };
        });
        setNotas(map);
      })
      .catch(() => {})
      .finally(() => setLoadingNotas(false));
  }, [materiaId, periodoId]);

  // Si parcial activo > numParciales, ajustar
  useEffect(() => {
    if (parcial > numParciales) setParcial(numParciales);
  }, [numParciales]);

  const upd = (id, val) => setNotas(p => ({ ...p, [id]: { ...p[id], [parcial]: val } }));
  const get = (id) => {
    const v = notas[id]?.[parcial];
    return v === null || v === undefined ? '' : String(v);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const registros = alumnos.map(a => ({ alumno_id: a.id, calificacion: get(a.id) })).filter(r => r.calificacion !== '');
      if (registros.length > 0) {
        await api.guardarCaptura({ materia_id: materiaId, periodo_id: periodoId || undefined, parcial, registros });
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

  if (loading || loadingNotas) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Cargando...</p>;

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
            {[2, 3].map(n => <option key={n} value={n}>{n} parciales</option>)}
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
          <button className={`btn btn-primary${saving ? ' loading' : ''}`} onClick={guardar} disabled={saving || !alumnos.length || !materiaId}>
            {saving ? 'Guardando...' : !materiaId ? 'Selecciona una materia' : `Guardar Parcial ${parcial}`}
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <input type="number" className="grade-input" min="0" max="100" step="0.1"
                          value={val} placeholder="—"
                          onChange={e => upd(a.id, e.target.value)}
                          style={{ textAlign: 'center', width: 80 }} />
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)',
                          background: 'var(--gray-100)', border: '1px solid var(--gray-200)',
                          borderRadius: '999px', padding: '1px 7px', whiteSpace: 'nowrap', lineHeight: '1.6'
                        }}>/100</span>
                      </div>
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
function TabAsistencias({ alumnos, loading, numParciales, materiaId, grupoId, periodoId, periodoNombre, periodoInicio, periodoFin }) {

  // Clave única por grupo + materia + número de parciales
  const storageKey = (n) => `captura_rangos_${grupoId || 'x'}_${materiaId || 'x'}_${n}`;

  // Fecha de hoy en formato YYYY-MM-DD (local, sin desplazamiento UTC)
  const hoy = new Date();
  const HOY = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  // Fechas reales del periodo, o fallback a valores por defecto
  const INICIO = periodoInicio || '2026-09-01';
  const FIN    = periodoFin    || '2026-12-12';

  // Etiqueta legible del cuatrimestre para el toolbar
  const labelCuatrimestre = periodoNombre || 'Cuatrimestre';

  const generarRangos = (n) => {
    const inicio = new Date(INICIO + 'T12:00:00'); // hora fija para evitar desfase UTC
    const fin    = new Date(FIN    + 'T12:00:00');
    const totalDias = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
    const diasPorParcial = Math.floor(totalDias / n);
    return Array.from({ length: n }, (_, i) => {
      const desde = new Date(inicio);
      desde.setDate(inicio.getDate() + i * diasPorParcial);
      const hasta = new Date(i === n - 1 ? fin : new Date(inicio));
      if (i < n - 1) hasta.setDate(inicio.getDate() + (i + 1) * diasPorParcial - 1);
      return {
        label: `Parcial ${i + 1}`,
        desde: desde.toISOString().slice(0, 10),
        hasta: hasta.toISOString().slice(0, 10),
      };
    });
  };

  // Inicializar rangos: primero intenta desde localStorage, luego genera
  const initRangos = (n) => {
    try {
      const saved = localStorage.getItem(storageKey(n));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === n) return parsed;
      }
    } catch (_) {}
    return generarRangos(n);
  };

  const [rangos, setRangosState]    = useState(() => initRangos(numParciales));
  const [showConfig, setShowConfig] = useState(false);
  const [parcialActivo, setParcialActivo] = useState(1);
  const [asist, setAsist]           = useState({});
  const [loadingAsist, setLoadingAsist] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState({ text: '', type: 'success' });
  const [avisoFuturo, setAvisoFuturo] = useState('');

  // Wrapper para setRangos que también persiste en localStorage
  const setRangos = (updater) => {
    setRangosState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(storageKey(next.length), JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  // Cuando cambia numParciales, cargar desde localStorage o regenerar
  // También recargar cuando cambia grupo o materia
  useEffect(() => {
    setRangosState(initRangos(numParciales));
    setParcialActivo(1);
  }, [numParciales, grupoId, materiaId, periodoInicio, periodoFin]);

  // Cargar asistencias existentes cuando cambia materia o periodo
  useEffect(() => {
    if (!materiaId) { setAsist({}); return; }
    setLoadingAsist(true);
    api.asistenciasMateria(materiaId, periodoId)
      .then(r => {
        const map = {};
        (r?.data || []).forEach(a => {
          if (!map[a.estudiante_id]) map[a.estudiante_id] = {};
          // asistio: true → 'P', false → 'A'  (justificado no se puede distinguir sin campo extra)
          map[a.estudiante_id][a.fecha] = a.asistio ? 'P' : 'A';
        });
        setAsist(map);
      })
      .catch(() => {})
      .finally(() => setLoadingAsist(false));
  }, [materiaId, periodoId]);

  // Clasificación de una fecha respecto a hoy
  const clasificarFecha = (fecha) => {
    if (fecha < HOY) return 'pasado';
    if (fecha === HOY) return 'hoy';
    return 'futuro';
  };

  const toggle = (alumnoId, fecha) => {
    const cls = clasificarFecha(fecha);
    if (cls === 'futuro') {
      setAvisoFuturo(fecha);
      setTimeout(() => setAvisoFuturo(''), 3000);
      return; // bloquear sin modificar estado
    }
    // hoy y pasado: permitir ciclo normal
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
    setMsg({ text: '', type: 'success' });
    try {
      const registros = [];
      alumnos.forEach(a => {
        Object.entries(asist[a.id] || {}).forEach(([fecha, estado]) => {
          // Doble chequeo: nunca enviar fechas futuras
          if (clasificarFecha(fecha) === 'futuro') return;
          registros.push({
            alumno_id: a.id,
            materia_id: materiaId || undefined,
            fecha,
            estado: estado === 'P' ? 'presente' : estado === 'A' ? 'ausente' : 'justificado',
          });
        });
      });

      if (registros.length === 0) {
        setMsg({ text: 'No hay asistencias marcadas para guardar.', type: 'warn' });
        setSaving(false);
        return;
      }

      const res = await api.guardarCaptura({ tipo: 'asistencias', periodo_id: periodoId || undefined, registros });
      if (res?.success) {
        setMsg({ text: res.message || `${registros.length} asistencias guardadas`, type: 'success' });
      } else {
        setMsg({ text: res?.message || 'Error al guardar', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setMsg({ text: e.message || 'Error de conexión', type: 'error' });
    }
    setSaving(false);
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  };

  const parcialDias = rangos.map(r => ({
    ...r,
    dias: dateRange(r.desde, r.hasta).filter(d => d.getDay() !== 0 && d.getDay() !== 6),
  }));
  const totalDias = parcialDias.reduce((s, p) => s + p.dias.length, 0);

  // Solo mostrar el parcial activo en la tabla
  const parcialDiasVisibles = parcialDias.filter((_, i) => i + 1 === parcialActivo);

  const msgColor = msg.type === 'error' ? 'var(--danger)' : msg.type === 'warn' ? 'var(--warning)' : 'var(--success)';

  if (loading || loadingAsist) return <p style={{ padding: '2rem', color: 'var(--gray-500)', textAlign: 'center' }}>Cargando...</p>;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
          <strong>{labelCuatrimestre}</strong>
          {periodoInicio && periodoFin && (
            <span style={{ color: 'var(--gray-400)', marginLeft: '0.4rem' }}>
              ({periodoInicio} → {periodoFin})
            </span>
          )}
          {' · '}{totalDias} días hábiles · {rangos.length} parciales
          <span style={{ marginLeft: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
            Hoy: {HOY}
          </span>
        </span>

        {/* Selector de parcial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--gray-100)', borderRadius: 'var(--border-radius)', padding: '3px' }}>
          {rangos.map((r, i) => (
            <button
              key={i}
              onClick={() => setParcialActivo(i + 1)}
              style={{
                padding: '4px 14px', borderRadius: 'var(--border-radius-sm)', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                background: parcialActivo === i + 1 ? '#fff' : 'transparent',
                color: parcialActivo === i + 1 ? 'var(--primary-600)' : 'var(--gray-500)',
                boxShadow: parcialActivo === i + 1 ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(!showConfig)}>
          Configurar rangos
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {msg.text && (
            <span style={{ fontSize: '0.85rem', color: msgColor, fontWeight: 600 }}>{msg.text}</span>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
            {[['P','Presente','var(--success)'],['A','Ausente','var(--danger)'],['J','Justificado','var(--warning)'],['·','Futuro (bloqueado)','var(--gray-300)']].map(([k,l,c]) => (
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

      {/* Aviso fecha futura */}
      {avisoFuturo && (
        <div style={{ margin: '0.5rem 1.25rem 0', padding: '0.6rem 1rem', borderRadius: 'var(--border-radius)', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          No se puede registrar asistencia para el {avisoFuturo} — es una fecha futura.
        </div>
      )}

      {/* Config rangos */}
      {showConfig && (
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', margin: '1rem 1.25rem', padding: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>Rangos de Parciales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rangos.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-600)', minWidth: 72 }}>{r.label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Desde:</span>
                <input type="date" value={r.desde}
                  onChange={e => setRangos(prev => prev.map((x,j) => j===i ? {...x, desde: e.target.value} : x))}
                  style={{ padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Hasta:</span>
                <input type="date" value={r.hasta}
                  onChange={e => setRangos(prev => prev.map((x,j) => j===i ? {...x, hasta: e.target.value} : x))}
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
        <div style={{ overflowX: 'auto', overflowY: 'visible', padding: '0 1.25rem 1.25rem', maxWidth: '100%', width: '100%' }}>
          <table className="asist-calendar">
            <thead>
              <tr>
                <th className="alumno-cell" rowSpan={2} style={{ minWidth: 160 }}>Alumno</th>
                {parcialDiasVisibles.map((p, pi) => (
                  <th key={pi} colSpan={p.dias.length} className="parcial-header"
                    style={{ textAlign: 'center', background: `hsl(${220 + (parcialActivo-1)*40},70%,95%)`, color: `hsl(${220 + (parcialActivo-1)*40},60%,35%)` }}>
                    {p.label} ({p.dias.length}d)
                  </th>
                ))}
                <th style={{ textAlign: 'center', minWidth: 60, background: 'var(--gray-50)' }}>% Asist.</th>
              </tr>
              <tr>
                {parcialDiasVisibles.map(p => p.dias.map(d => {
                  const k = d.toISOString().slice(0, 10);
                  const cls = clasificarFecha(k);
                  const esHoy = cls === 'hoy';
                  const esFuturo = cls === 'futuro';
                  return (
                    <th key={k} style={{
                      minWidth: 28, fontSize: '0.6rem', fontWeight: 500, padding: '3px 2px', textAlign: 'center',
                      color: esFuturo ? 'var(--gray-300)' : esHoy ? 'var(--primary-600)' : 'var(--gray-500)',
                      background: esHoy ? 'var(--primary-50)' : 'transparent',
                    }}>
                      <div>{DIAS[d.getDay()]}</div>
                      <div style={{ fontWeight: 700, color: esFuturo ? 'var(--gray-300)' : esHoy ? 'var(--primary-600)' : 'var(--gray-700)' }}>{d.getDate()}</div>
                      <div style={{ color: esFuturo ? 'var(--gray-200)' : 'var(--gray-400)' }}>{MESES[d.getMonth()]}</div>
                    </th>
                  );
                }))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map(a => {
                const allDias = parcialDias.flatMap(p => p.dias);
                const pasadosYHoy = allDias.filter(d => {
                  const k = d.toISOString().slice(0, 10);
                  return clasificarFecha(k) !== 'futuro';
                });
                const total = pasadosYHoy.length;
                const presentes = pasadosYHoy.filter(d => {
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
                    {parcialDiasVisibles.map(p => p.dias.map(d => {
                      const k = d.toISOString().slice(0, 10);
                      const v = getVal(a.id, k);
                      const cls = clasificarFecha(k);
                      const esFuturo = cls === 'futuro';
                      const esHoy    = cls === 'hoy';
                      return (
                        <td key={k} style={{ background: esHoy ? 'var(--primary-50)' : 'transparent' }}>
                          <button
                            className={`asist-btn ${esFuturo ? 'futuro' : (v || 'none')}`}
                            onClick={() => toggle(a.id, k)}
                            title={esFuturo ? `${k} — fecha futura, no disponible` : k}
                            style={{
                              cursor: esFuturo ? 'not-allowed' : 'pointer',
                              opacity: esFuturo ? 0.35 : 1,
                            }}
                          >
                            {esFuturo ? '·' : (v || '·')}
                          </button>
                        </td>
                      );
                    }))}
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                      {total > 0 ? `${pct}%` : '—'}
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
  const [grupos, setGrupos]       = useState([]);
  const [grupoId, setGrupoId]     = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [alumnos, setAlumnos]     = useState([]);
  const [loadingGrupos, setLoadGrupos] = useState(true);
  const [loadingAl, setLoadAl]    = useState(false);
  const [numParciales, setNumP]   = useState(3);

  // Cargar grupos con sus materias al montar
  useEffect(() => {
    api.capturaGrupos()
      .then(r => setGrupos(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => {})
      .finally(() => setLoadGrupos(false));
  }, []);

  // Cuando cambia el grupo, resetear materia y cargar alumnos
  useEffect(() => {
    setMateriaId('');
    if (!grupoId) { setAlumnos([]); return; }
    setLoadAl(true);
    api.alumnosGrupo(grupoId)
      .then(r => setAlumnos(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => {})
      .finally(() => setLoadAl(false));
  }, [grupoId]);

  const grupoSel   = grupos.find(g => String(g.id) === String(grupoId));
  const materias   = grupoSel?.materias || [];
  const materiaSel = materias.find(m => String(m.id) === String(materiaId));

  const TABS = [
    { id: 'general',        label: 'General'        },
    { id: 'calificaciones', label: 'Calificaciones' },
    { id: 'asistencias',    label: 'Asistencias'    },
  ];

  return (
    <div>
      <TopHeader title="Captura de Calificaciones" />
      <div className="page-content">

        {/* Filtros */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-700)' }}>Filtros de Captura Docente</span>
          </div>
          <div className="card-body">
            {loadingGrupos ? (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Cargando grupos...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

                {/* Select grupo */}
                <div className="form-group no-icon" style={{ marginBottom: 0 }}>
                  <label>GRUPO</label>
                  <select value={grupoId} onChange={e => setGrupoId(e.target.value)}>
                    <option value="">Seleccionar grupo...</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.carrera_clave} {g.semestre}° — Grupo &quot;{g.nombre}&quot; ({g.turno})
                      </option>
                    ))}
                  </select>
                  {grupos.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 4, display: 'block' }}>
                      No hay grupos activos en la base de datos.
                    </span>
                  )}
                </div>

                {/* Select materia */}
                <div className="form-group no-icon" style={{ marginBottom: 0 }}>
                  <label>MATERIA</label>
                  <select
                    value={materiaId}
                    onChange={e => setMateriaId(e.target.value)}
                    disabled={!grupoId || materias.length === 0}
                  >
                    <option value="">{grupoId ? 'Seleccionar materia...' : 'Primero selecciona un grupo'}</option>
                    {materias.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.clave})
                      </option>
                    ))}
                  </select>
                  {grupoId && materias.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 4, display: 'block' }}>
                      No hay materias asignadas para este grupo.
                    </span>
                  )}
                </div>

                {/* Info del grupo seleccionado */}
                <div className="form-group no-icon" style={{ marginBottom: 0 }}>
                  <label>GRUPO SELECCIONADO</label>
                  <input type="text" readOnly placeholder="—"
                    value={grupoSel
                      ? `${grupoSel.carrera_clave} ${grupoSel.semestre}° "${grupoSel.nombre}" · ${grupoSel.turno} · ${alumnos.length} alumnos`
                      : ''}
                    style={{ background: 'var(--gray-50)', cursor: 'default' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card con tabs */}
        <div className="card card-overflow-x">
          <div className="captura-tabs">
            {TABS.map(t => (
              <button key={t.id}
                className={`captura-tab-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <TabGeneral
              grupoId={grupoId}
              materiaId={materiaId}
              periodoId={grupoSel?.periodo_id || ''}
            />
          )}
          {tab === 'calificaciones' && (
            <TabCalificaciones
              alumnos={alumnos}
              loading={loadingAl}
              numParciales={numParciales}
              setNumParciales={setNumP}
              materiaId={materiaId}
              periodoId={grupoSel?.periodo_id || ''}
            />
          )}
          {tab === 'asistencias' && (
            <TabAsistencias
              alumnos={alumnos}
              loading={loadingAl}
              numParciales={numParciales}
              materiaId={materiaId}
              grupoId={grupoId}
              periodoId={grupoSel?.periodo_id || ''}
              periodoNombre={grupoSel?.periodo_nombre || ''}
              periodoInicio={grupoSel?.periodo_fecha_inicio || null}
              periodoFin={grupoSel?.periodo_fecha_fin || null}
            />
          )}
        </div>

      </div>
    </div>
  );
}

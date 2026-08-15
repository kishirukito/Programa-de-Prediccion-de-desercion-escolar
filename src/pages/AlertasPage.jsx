import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';
import TableLoader from '../components/TableLoader';

const nivelConfig = {
  critico: { label: 'Crítico', cls: 'badge-risk-critical' },
  alto:    { label: 'Alto',    cls: 'badge-risk-high' },
  medio:   { label: 'Medio',  cls: 'badge-risk-medium' },
};
const estadoConfig = {
  pendiente:      { label: 'Pendiente',      cls: 'badge-danger' },
  en_seguimiento: { label: 'En seguimiento', cls: 'badge-warning' },
  atendida:       { label: 'Atendida',       cls: 'badge-success' },
  cerrada:        { label: 'Cerrada',        cls: 'badge-info' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—';

export default function AlertasPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [generando, setGenerando] = useState(false);
  const [msg, setMsg] = useState('');

  // Modal
  const [modal, setModal] = useState(false);
  const [alertaSel, setAlertaSel] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('pendiente');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.alertas();
      if (res?.success) setAll(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const alertas = all.filter(a => {
    if (filtroEstado && a.estado !== filtroEstado) return false;
    if (filtroNivel && a.nivel_riesgo !== filtroNivel) return false;
    return true;
  });

  const counts = { pendiente: 0, en_seguimiento: 0, atendida: 0, cerrada: 0 };
  all.forEach(a => { if (counts[a.estado] !== undefined) counts[a.estado]++; });

  const generar = async () => {
    setGenerando(true);
    try {
      const res = await api.generarAlertas();
      if (res?.success) { flash(res.message); cargar(); }
    } catch (e) { console.error(e); }
    finally { setGenerando(false); }
  };

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const openModal = (alerta) => {
    setAlertaSel(alerta);
    setNuevoEstado(alerta.estado || 'pendiente');
    setNotas(alerta.notas_cierre || '');
    setModal(true);
  };

  const guardar = async () => {
    if (!alertaSel) return;
    setGuardando(true);
    try {
      const res = await api.updateAlerta(alertaSel.id, { estado: nuevoEstado, notas_cierre: notas });
      if (res?.success) {
        setAll(prev => prev.map(a => a.id === alertaSel.id ? { ...a, estado: nuevoEstado, notas_cierre: notas } : a));
        flash('Alerta actualizada');
        setModal(false);
      }
    } catch (e) { console.error(e); }
    finally { setGuardando(false); }
  };

  const statCards = [
    { key: 'pendiente',      label: 'Pendientes',      color: 'var(--danger)',  bg: 'var(--danger-bg)',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { key: 'en_seguimiento', label: 'En Seguimiento',  color: 'var(--warning)', bg: 'var(--warning-bg)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { key: 'atendida',       label: 'Atendidas',       color: 'var(--success)', bg: 'var(--success-bg)', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { key: 'cerrada',        label: 'Cerradas',        color: 'var(--info)',    bg: 'var(--info-bg)',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ];

  return (
    <div>
      <TopHeader title="Alertas Tempranas" />
      <div className="page-content">
        {msg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg}</div>}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="filter-bar">
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="pendiente">🔴 Pendiente</option>
                <option value="en_seguimiento">🟡 En seguimiento</option>
                <option value="atendida">🟢 Atendida</option>
                <option value="cerrada">⚫ Cerrada</option>
              </select>
              <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
                <option value="">Todos los niveles</option>
                <option value="critico">🔴 Crítico</option>
                <option value="alto">🟠 Alto</option>
                <option value="medio">🟡 Medio</option>
              </select>
            </div>
          </div>
          <div className="toolbar-right">
            <button className={`btn btn-primary${generando ? ' loading' : ''}`} onClick={generar} disabled={generando}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {generando ? 'Generando...' : 'Generar Alertas'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
          {statCards.map(s => (
            <div key={s.key} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFiltroEstado(s.key)}>
              <div className="stat-header">
                <span className="stat-label">{s.label}</span>
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{counts[s.key]}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Nivel</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Tutor</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoader cols={7} rows={5} />
                  ) : alertas.length === 0 ? (
                    <tr><td colSpan="7">
                      <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <h3>No hay alertas</h3><p>No se encontraron alertas con los filtros seleccionados</p>
                      </div>
                    </td></tr>
                  ) : alertas.map(a => {
                    const nivel = nivelConfig[a.nivel_riesgo] || { label: a.nivel_riesgo, cls: 'badge-info' };
                    const estado = estadoConfig[a.estado] || { label: a.estado, cls: 'badge-info' };
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.alumno_nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.carrera}</div>
                        </td>
                        <td><span className={`badge ${nivel.cls} badge-dot`}>{nivel.label}</span></td>
                        <td style={{ maxWidth: 200 }}><div style={{ fontSize: '0.8rem', color: 'var(--gray-700)', whiteSpace: 'normal' }}>{a.motivo}</div></td>
                        <td><span className={`badge ${estado.cls} badge-dot`}>{estado.label}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                          {a.tutor_nombre
                            ? <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{a.tutor_nombre}</span>
                            : <span style={{ color: 'var(--gray-400)' }}>Sin tutor</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{fmtDate(a.fecha)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openModal(a)} style={{ color: 'var(--primary-600)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Gestionar
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

      {/* Modal Gestionar */}
      {modal && alertaSel && (
        <div className="modal-overlay show">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Gestionar Alerta</h3>
              <button className="modal-close" onClick={() => setModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--gray-800)' }}>{alertaSel.alumno_nombre}</strong>
                  <span className={`badge ${(nivelConfig[alertaSel.nivel_riesgo] || {}).cls || 'badge-info'} badge-dot`}>{(nivelConfig[alertaSel.nivel_riesgo] || {}).label || alertaSel.nivel_riesgo}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}><strong>Motivo:</strong> {alertaSel.motivo}</div>
              </div>
              <div className="form-group no-icon">
                <label>Nuevo Estado *</label>
                <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_seguimiento">En seguimiento</option>
                  <option value="atendida">Atendida</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>
              <div className="form-group no-icon">
                <label>Notas / Observaciones</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows="3" placeholder="Notas sobre la atención o cierre..." style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', fontSize: '0.85rem', color: 'var(--gray-700)', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className={`btn btn-primary${guardando ? ' loading' : ''}`} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

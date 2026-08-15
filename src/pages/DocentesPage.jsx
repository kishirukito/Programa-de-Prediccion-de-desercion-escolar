import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';
import TableLoader from '../components/TableLoader';
export default function DocentesPage() {
  const [tab, setTab]               = useState('asignaciones');
  const [asignaciones, setAsig]     = useState([]);
  const [tutorias, setTutorias]     = useState([]);
  const [cats, setCats]             = useState({ docentes: [], grupos: [], materias: [], tutores: [] });
  const [loading, setLoading]       = useState(true);
  const [buscar, setBuscar]         = useState('');
  const [buscarT, setBuscarT]       = useState('');
  const [msg, setMsg]               = useState('');

  const [modalAsig, setModalAsig]   = useState(false);
  const [formAsig, setFormAsig]     = useState({ docente_id: '', grupo_id: '', materia_id: '', periodo: '2026-1' });
  const [savingAsig, setSavingAsig] = useState(false);

  const [modalTutor, setModalTutor]   = useState(false);
  const [alumnoSel, setAlumnoSel]     = useState(null);
  const [tutorSel, setTutorSel]       = useState('');
  const [savingTutor, setSavingTutor] = useState(false);

  const flash = t => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const loadAsig = async () => {
    setLoading(true);
    try {
      const r = await api.asignacionesDocente();
      if (r?.success) {
        setAsig(r.data || []);
        setCats(p => ({ ...p, docentes: r.docentes || [], grupos: r.grupos || [], materias: r.materias || [] }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTut = async () => {
    try {
      const r = await api.tutoriasDocente();
      if (r?.success) { setTutorias(r.data || []); setCats(p => ({ ...p, tutores: r.tutores || [] })); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadAsig(); }, []);

  const switchTab = t => {
    setTab(t);
    if (t === 'tutorias' && tutorias.length === 0) loadTut();
  };

  const asigFil = asignaciones.filter(a => {
    const t = buscar.toLowerCase();
    return !t || (a.docente_nombre + a.materia_nombre + a.carrera_clave).toLowerCase().includes(t);
  });

  const tutFil = tutorias.filter(a => {
    const t = buscarT.toLowerCase();
    return !t || `${a.nombre} ${a.apellido_paterno} ${a.matricula}`.toLowerCase().includes(t);
  });

  const guardarAsig = async () => {
    if (!formAsig.docente_id || !formAsig.grupo_id || !formAsig.materia_id) { flash('Complete todos los campos'); return; }
    setSavingAsig(true);
    try { flash('Asignación creada'); setModalAsig(false); loadAsig(); }
    catch (e) { flash('Error al guardar'); }
    setSavingAsig(false);
  };

  const eliminarAsig = async (id, label) => {
    if (!window.confirm(`¿Eliminar "${label}"?`)) return;
    try { await api.eliminarAsignacion(id); flash('Eliminada'); loadAsig(); }
    catch (e) { console.error(e); }
  };

  const guardarTutor = async () => {
    setSavingTutor(true);
    try { await api.asignarTutor({ alumno_id: alumnoSel.id, tutor_id: tutorSel || null }); flash('Tutor actualizado'); setModalTutor(false); loadTut(); }
    catch (e) { flash('Error al guardar'); }
    setSavingTutor(false);
  };

  const tabStyle = (active) => ({
    borderRadius: 0, background: 'none',
    borderBottom: active ? '2px solid var(--primary-600)' : '2px solid transparent',
    marginBottom: -2,
    color: active ? 'var(--primary-600)' : 'var(--gray-500)',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      <TopHeader title="Docentes y Tutores" />
      <div className="page-content">

        {msg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg}</div>}

        <div className="card">

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)', padding: '0 1.25rem' }}>
            <button className={`tab-btn${tab === 'asignaciones' ? ' active' : ''}`} onClick={() => switchTab('asignaciones')} style={tabStyle(tab === 'asignaciones')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Asignaciones Académicas
            </button>
            <button className={`tab-btn${tab === 'tutorias' ? ' active' : ''}`} onClick={() => switchTab('tutorias')} style={tabStyle(tab === 'tutorias')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Asignación de Tutores
            </button>
          </div>

          {/* ── Tab: Asignaciones ── */}
          {tab === 'asignaciones' && (
            <div>
              <div className="toolbar" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--gray-100)', margin: 0 }}>
                <div className="toolbar-left">
                  <div className="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Buscar asignaciones..." value={buscar} onChange={e => setBuscar(e.target.value)} />
                  </div>
                </div>
                <div className="toolbar-right">
                  <button className="btn btn-primary" onClick={() => { setFormAsig({ docente_id: '', grupo_id: '', materia_id: '', periodo: '2026-1' }); setModalAsig(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nueva Asignación
                  </button>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Grupo</th>
                      <th>Materia</th>
                      <th>Periodo</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <TableLoader cols={5} rows={5} />
                      : asigFil.length === 0
                        ? <tr><td colSpan="5"><div className="empty-state"><h3>No hay asignaciones</h3><p>Agrega una asignación docente-grupo-materia</p></div></td></tr>
                        : asigFil.map(a => (
                          <tr key={a.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.7rem' }}>{(a.docente_nombre || '?')[0].toUpperCase()}</div>
                                <div>
                                  <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.docente_nombre}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.docente_email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>{a.carrera_clave} {a.semestre}° &quot;{a.grupo_nombre}&quot;</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.turno}</div>
                            </td>
                            <td><span className="badge badge-primary">{a.materia_nombre}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>{a.periodo}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => eliminarAsig(a.id, `${a.docente_nombre} — ${a.materia_nombre}`)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Tutorías ── */}
          {tab === 'tutorias' && (
            <div>
              <div className="toolbar" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--gray-100)', margin: 0 }}>
                <div className="toolbar-left">
                  <div className="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Buscar alumnos..." value={buscarT} onChange={e => setBuscarT(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Carrera / Grupo</th>
                      <th>Tutor Asignado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tutFil.length === 0
                      ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Sin alumnos</td></tr>
                      : tutFil.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.7rem' }}>{(a.nombre||'?')[0].toUpperCase()}{(a.apellido_paterno||'?')[0].toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{a.nombre} {a.apellido_paterno}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{a.matricula}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{a.carrera_clave} — {a.semestre}° Sem</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Grupo {a.grupo_nombre}</div>
                          </td>
                          <td>
                            {a.tutor_nombre
                              ? <span className="badge badge-success badge-dot">{a.tutor_nombre}</span>
                              : <span className="badge badge-danger badge-dot">Sin tutor</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-600)' }} onClick={() => { setAlumnoSel(a); setTutorSel(a.tutor_id || ''); setModalTutor(true); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              {a.tutor_nombre ? 'Cambiar' : 'Asignar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Asignación */}
      {modalAsig && (
        <div className="modal-overlay show">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Nueva Asignación Académica</h3>
              <button className="modal-close" onClick={() => setModalAsig(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {[
                { label: 'Docente *',  field: 'docente_id',  opts: cats.docentes.map(d => ({ v: d.id, l: `${d.nombre} (${d.email})` })) },
                { label: 'Grupo *',    field: 'grupo_id',    opts: cats.grupos.map(g => ({ v: g.id, l: `${g.carrera_clave} ${g.semestre}° "${g.nombre}" — ${g.turno}` })) },
                { label: 'Materia *',  field: 'materia_id',  opts: cats.materias.map(m => ({ v: m.id, l: `${m.nombre} (${m.clave})` })) },
              ].map(({ label, field, opts }) => (
                <div key={field} className="form-group no-icon">
                  <label>{label}</label>
                  <select value={formAsig[field]} onChange={e => setFormAsig(p => ({ ...p, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                    <option value="">Seleccionar...</option>
                    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div className="form-group no-icon">
                <label>Periodo</label>
                <input type="text" value={formAsig.periodo} onChange={e => setFormAsig(p => ({ ...p, periodo: e.target.value }))} placeholder="Ej: 2026-1" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalAsig(false)}>Cancelar</button>
              <button className={`btn btn-primary${savingAsig ? ' loading' : ''}`} onClick={guardarAsig} disabled={savingAsig}>Guardar Asignación</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tutor */}
      {modalTutor && alumnoSel && (
        <div className="modal-overlay show">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Asignar Tutor — {alumnoSel.nombre} {alumnoSel.apellido_paterno}</h3>
              <button className="modal-close" onClick={() => setModalTutor(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--border-radius)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{alumnoSel.nombre} {alumnoSel.apellido_paterno}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{alumnoSel.matricula} — {alumnoSel.carrera_clave} {alumnoSel.semestre}° Sem</div>
              </div>
              <div className="form-group no-icon">
                <label>Tutor *</label>
                <select value={tutorSel} onChange={e => setTutorSel(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                  <option value="">Sin tutor asignado</option>
                  {cats.tutores.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.rol})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalTutor(false)}>Cancelar</button>
              <button className={`btn btn-primary${savingTutor ? ' loading' : ''}`} onClick={guardarTutor} disabled={savingTutor}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

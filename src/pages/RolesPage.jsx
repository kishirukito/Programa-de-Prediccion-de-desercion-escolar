import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';
import TableLoader from '../components/TableLoader';
const PERMISOS = {
  'Dashboard':   [{ id:1, nombre:'dashboard.ver', descripcion:'Ver dashboard principal' }],
  'Alumnos':     [{ id:2, nombre:'alumnos.ver', descripcion:'Ver listado de alumnos' }, { id:3, nombre:'alumnos.crear', descripcion:'Registrar nuevos alumnos' }, { id:4, nombre:'alumnos.editar', descripcion:'Editar información de alumnos' }],
  'Expedientes': [{ id:5, nombre:'expedientes.ver', descripcion:'Ver expedientes y niveles de riesgo' }, { id:6, nombre:'expedientes.seguimiento', descripcion:'Registrar acciones de seguimiento' }],
  'Captura':     [{ id:7, nombre:'captura.ver', descripcion:'Ver interfaz de captura' }, { id:8, nombre:'captura.calificaciones', descripcion:'Capturar calificaciones' }, { id:9, nombre:'captura.asistencias', descripcion:'Capturar asistencias' }],
  'Alertas':     [{ id:10, nombre:'alertas.ver', descripcion:'Ver listado de alertas' }, { id:11, nombre:'alertas.gestionar', descripcion:'Gestionar estado de alertas' }, { id:12, nombre:'alertas.generar', descripcion:'Generar alertas automáticas' }],
  'Usuarios':    [{ id:13, nombre:'usuarios.ver', descripcion:'Ver listado de usuarios' }, { id:14, nombre:'usuarios.crear', descripcion:'Crear nuevos usuarios' }, { id:15, nombre:'usuarios.editar', descripcion:'Editar usuarios existentes' }],
  'Roles':       [{ id:16, nombre:'roles.ver', descripcion:'Ver listado de roles' }, { id:17, nombre:'roles.editar', descripcion:'Editar roles y permisos' }],
  'Reportes':    [{ id:18, nombre:'reportes.ver', descripcion:'Ver reportes y estadísticas' }, { id:19, nombre:'reportes.generar', descripcion:'Generar y exportar reportes' }],
};

export default function RolesPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [msg, setMsg] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', permisos: [] });
  const [guardando, setGuardando] = useState(false);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.roles();
      if (res?.success) setAll(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const roles = all.filter(r => !buscar || r.nombre.toLowerCase().includes(buscar.toLowerCase()));

  const openNew = () => {
    setEditId(null);
    setForm({ nombre: '', descripcion: '', permisos: [] });
    setModal(true);
  };

  const openEdit = (rol) => {
    setEditId(rol.id || rol.nombre);
    const allPerms = Object.values(PERMISOS).flat();
    const checked = allPerms.filter(p => (rol.permisos || []).some(rp => rp === p.descripcion || rp === p.nombre)).map(p => p.id);
    setForm({ nombre: rol.nombre, descripcion: rol.descripcion || '', permisos: checked });
    setModal(true);
  };

  const togglePerm = (id) => {
    setForm(p => ({ ...p, permisos: p.permisos.includes(id) ? p.permisos.filter(x => x !== id) : [...p.permisos, id] }));
  };

  const guardar = async () => {
    if (!form.nombre) { flash('El nombre del rol es requerido'); return; }
    setGuardando(true);
    try {
      // Simulate save (no real API endpoint yet)
      flash(editId ? 'Rol actualizado' : 'Rol creado');
      setModal(false);
      cargar();
    } catch (e) { flash('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const eliminar = (rol) => {
    if (!window.confirm(`¿Eliminar el rol "${rol.nombre}"?`)) return;
    flash('Rol eliminado');
    setAll(prev => prev.filter(r => r !== rol));
  };

  return (
    <div>
      <TopHeader title="Roles y Permisos" />
      <div className="page-content">
        {msg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg}</div>}

        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar roles..." value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-primary" onClick={openNew}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo Rol
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Descripción</th>
                    <th>Permisos Habilitados</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <TableLoader cols={4} rows={5} />
                  : roles.length === 0 ? <tr><td colSpan="4"><div className="empty-state"><h3>No hay roles</h3></div></td></tr>
                  : roles.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{r.nombre}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{r.descripcion || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {(r.permisos || []).slice(0, 4).map((p, j) => (
                            <span key={j} className="badge badge-success" style={{ fontSize: '0.7rem' }}>{p}</span>
                          ))}
                          {(r.permisos || []).length > 4 && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>+{r.permisos.length - 4} más</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} style={{ color: 'var(--primary-600)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Editar
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => eliminar(r)} style={{ color: 'var(--danger)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay show">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group no-icon">
                <label>Nombre del Rol *</label>
                <input type="text" placeholder="Ej: Coordinador" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="form-group no-icon">
                <label>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows="2" placeholder="Descripción breve del rol..." style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', color: 'var(--gray-700)', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-700)', margin: '1.25rem 0 0.75rem' }}>Permisos</h4>
              {Object.entries(PERMISOS).map(([modulo, perms]) => (
                <div key={modulo} className="permissions-group">
                  <div className="permissions-group-title">{modulo}</div>
                  <div className="permissions-list">
                    {perms.map(p => (
                      <div key={p.id} className="permission-item">
                        <input type="checkbox" id={`perm-${p.id}`} checked={form.permisos.includes(p.id)} onChange={() => togglePerm(p.id)} style={{ accentColor: 'var(--primary-600)', width: 16, height: 16 }} />
                        <label htmlFor={`perm-${p.id}`}>{p.descripcion}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className={`btn btn-primary${guardando ? ' loading' : ''}`} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

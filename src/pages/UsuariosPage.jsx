import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

const myId = JSON.parse(localStorage.getItem('user') || '{}')?.id || 1;

export default function UsuariosPage() {
  const [all, setAll]       = useState([]);
  const [loading, setLoad]  = useState(true);
  const [buscar, setBuscar] = useState('');
  const [msg, setMsg]       = useState({ text: '', type: 'success' });
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'Docente' });
  const [saving, setSaving] = useState(false);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3000);
  };

  const cargar = async () => {
    setLoad(true);
    try { const r = await api.usuarios(); if (r?.success) setAll(r.data || []); }
    catch (e) { console.error(e); }
    setLoad(false);
  };

  useEffect(() => { cargar(); }, []);

  const usuarios = all.filter(u => {
    const t = buscar.toLowerCase();
    return !t || `${u.nombre} ${u.apellido} ${u.email} ${u.rol}`.toLowerCase().includes(t);
  });

  const openNew = () => {
    setEditId(null);
    setForm({ nombre: '', apellido: '', email: '', password: '', rol: 'Docente' });
    setModal(true);
  };

  const openEdit = async (id) => {
    try {
      const r = await api.getUsuario(id);
      if (r?.success) {
        const u = r.data;
        setForm({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', password: '', rol: u.rol || 'Docente' });
        setEditId(id);
        setModal(true);
      }
    } catch (e) { flash('Error al cargar usuario', 'error'); }
  };

  const guardar = async () => {
    if (!form.nombre || !form.email || !form.rol) { flash('Complete los campos requeridos', 'warning'); return; }
    if (!editId && !form.password) { flash('La contraseña es requerida', 'warning'); return; }
    setSaving(true);
    try {
      const r = editId
        ? await api.editarUsuario(editId, { nombre: form.nombre, apellido: form.apellido, email: form.email, rol: form.rol, ...(form.password ? { password: form.password } : {}) })
        : await api.crearUsuario(form);
      if (r?.success) { flash(editId ? 'Usuario actualizado' : 'Usuario creado'); setModal(false); cargar(); }
    } catch (e) { flash('Error al guardar', 'error'); }
    setSaving(false);
  };

  const toggle = async (id) => {
    try { const r = await api.toggleUsuario(id); if (r?.success) setAll(p => p.map(u => u.id === id ? { ...u, activo: !u.activo } : u)); }
    catch (e) { console.error(e); }
  };

  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try { const r = await api.eliminarUsuario(id); if (r?.success) { flash('Usuario eliminado'); cargar(); } }
    catch (e) { flash('Error al eliminar', 'error'); }
  };

  return (
    <div>
      <TopHeader title="Gestión de Usuarios" />
      <div className="page-content">
        {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

        <div className="card">
          <div className="toolbar" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--gray-100)', margin: 0 }}>
            <div className="toolbar-left">
              <div className="search-bar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Buscar usuarios..." value={buscar} onChange={e => setBuscar(e.target.value)} />
              </div>
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={openNew}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Nuevo Usuario
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Registrado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Cargando...</td></tr>
                  : usuarios.length === 0
                    ? <tr><td colSpan="6"><div className="empty-state"><h3>No hay usuarios</h3><p>Crea un nuevo usuario para comenzar</p></div></td></tr>
                    : usuarios.map(u => {
                      const isSelf = u.id === myId;
                      const ini = `${(u.nombre||'?')[0]}${(u.apellido||'?')[0]}`.toUpperCase();
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{ini}</div>
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>
                                  {u.nombre} {u.apellido}
                                  {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--primary-600)', marginLeft: '0.25rem' }}>(Tú)</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-primary">{u.rol}</span></td>
                          <td>
                            {u.activo
                              ? <span className="badge badge-success badge-dot">Activo</span>
                              : <span className="badge badge-danger badge-dot">Inactivo</span>}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>—</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>2026</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost btn-sm" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => toggle(u.id)}>
                                {u.activo
                                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                              </button>
                              <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => openEdit(u.id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              {!isSelf && (
                                <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: 'var(--danger)' }} onClick={() => eliminar(u.id, `${u.nombre} ${u.apellido}`)}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay show">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group no-icon">
                  <label>Nombre *</label>
                  <input type="text" placeholder="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="form-group no-icon">
                  <label>Apellido *</label>
                  <input type="text" placeholder="Apellido" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
                </div>
              </div>
              <div className="form-group no-icon">
                <label>Correo Electrónico *</label>
                <input type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group no-icon">
                <label>Contraseña {!editId && '*'}</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                {editId && <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Dejar vacío para mantener la contraseña actual</p>}
              </div>
              <div className="form-group no-icon">
                <label>Rol *</label>
                <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid var(--gray-300)', borderRadius: 'var(--border-radius)', color: 'var(--gray-700)', fontSize: '0.875rem' }}>
                  <option value="">Seleccionar rol...</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Docente">Docente</option>
                  <option value="Tutor">Tutor</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className={`btn btn-primary${saving ? ' loading' : ''}`} onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

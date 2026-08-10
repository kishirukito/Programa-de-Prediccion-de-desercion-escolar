import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopHeader({ title }) {
  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Admin Usuario","role":"Administrador"}');
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const ref = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <header className="main-header">
        <div className="header-left">
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="header-right">
          {/* Campana */}
          <Link to="/alertas" className="header-bell" aria-label="Alertas"
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--border-radius)', color: 'var(--gray-500)', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </Link>

          {/* Dropdown usuario */}
          <div ref={ref} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(!open)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--border-radius)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>{initials}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{user.role}</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--gray-400)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Menú desplegable */}
            {open && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#fff', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-lg)',
                minWidth: 200, zIndex: 200, overflow: 'hidden',
              }}>
                {/* Info usuario */}
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div className="user-avatar" style={{ width: 38, height: 38, fontSize: '0.85rem', flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-900)' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{user.role}</div>
                    </div>
                  </div>
                </div>

                {/* Solo cerrar sesión */}
                <div style={{ padding: '0.375rem' }}>
                  <button
                    onClick={() => { setOpen(false); handleLogout(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', color: 'var(--danger)', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de perfil */}
      {modalPerfil && (
        <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) setModalPerfil(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Mi Perfil</h3>
              <button className="modal-close" onClick={() => setModalPerfil(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--primary-50)', borderRadius: 'var(--border-radius)', marginBottom: '1.25rem' }}>
                <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.1rem', flexShrink: 0 }}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{user.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Nombre completo', value: user.name },
                  { label: 'Rol asignado', value: user.role },
                  { label: 'Estado de cuenta', value: 'Activo' },
                  { label: 'Último acceso', value: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-800)', fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalPerfil(false)}>Cerrar</button>
              <button className="btn btn-danger" onClick={() => { setModalPerfil(false); handleLogout(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { path: '/dashboard', icon: 'dashboard',  label: 'Inicio' },
    { path: '/students',  icon: 'group',       label: 'Alumnos' },
    { path: '/alerts',    icon: 'warning',     label: 'Alertas', badge: true },
    { path: '/reports',   icon: 'assessment',  label: 'Reportes' },
];

const MobileNav = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-50"
            style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 relative group"
                        >
                            <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200
                                ${active ? 'bg-primary/12' : 'group-active:bg-surface-container'}`}>
                                <span
                                    className={`material-symbols-outlined transition-all text-xl ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {item.icon}
                                </span>
                                {item.badge && !active && (
                                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                                )}
                            </div>
                            <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
                                {item.label}
                            </span>
                            {active && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;

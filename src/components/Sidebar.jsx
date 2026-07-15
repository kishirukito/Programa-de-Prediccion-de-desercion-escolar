import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { path: "/dashboard",     icon: "dashboard",       label: "Dashboard" },
    { path: "/students",      icon: "group",           label: "Estudiantes" },
    { path: "/alerts",        icon: "warning",         label: "Alertas",       badge: 3 },
    { path: "/reports",       icon: "assessment",      label: "Reportes" },
    { path: "/attendance",    icon: "event_available", label: "Asistencias" },
    { path: "/grades",        icon: "history_edu",     label: "Calificaciones" },
    { path: "/interventions", icon: "bolt",            label: "Intervenciones" },
    { path: "/settings",      icon: "settings",        label: "Configuración" },
];

const Sidebar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const user = JSON.parse(localStorage.getItem('user') || '{"name":"Dr. Ricardo Silva","role":"Director Académico"}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <aside className="hidden md:flex flex-col w-64 sidebar-gradient h-screen sticky top-0 z-50 shadow-2xl">

            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        EduPredict <span className="text-blue-400">AI</span>
                    </span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto custom-scrollbar">
                <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">Principal</p>
                {navItems.slice(0, 4).map((item) => (
                    <NavLink key={item.path} item={item} active={isActive(item.path)} />
                ))}

                <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mt-5 mb-3">Académico</p>
                {navItems.slice(4).map((item) => (
                    <NavLink key={item.path} item={item} active={isActive(item.path)} />
                ))}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors group">
                    <div className="relative">
                        <img
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-400/60"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLy6W1CbiTOl30EI1ejTMiO2IHu8ZJ-PJHY6fXkmbcElTSDs1GxkMZdH6m9vuFZLhmI5y_9QxbV81QAtRnko3HdDsytzY6dvbBkWPrZ2UolHgoattEQeFiu5NBnfDGM4LqMOMHdYKVaZbm-lSopgJg3dammPBfsOvc5KwdtMBBRCf6BbxxP6JtEB8LhJn5fE_mriEc5-tQE5L7a1LoBheTTq7ChlJb6emmMkusxtcqXeRfAe5Rr0YU-UKKl9s5vDkWoFIVHmK5o_73"
                            alt="Admin"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 dot-pulse"></span>
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-white text-sm font-semibold truncate leading-tight">{user.name}</p>
                        <p className="text-white/40 text-xs truncate">{user.role}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        title="Cerrar Sesión" 
                        className="material-symbols-outlined text-white/30 text-lg hover:text-red-400 transition-colors flex items-center justify-center p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                    >
                        logout
                    </button>
                </div>
            </div>
        </aside>
    );
};

const NavLink = ({ item, active }) => (
    <Link
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
            ${active
                ? 'bg-blue-500/20 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/8'
            }`}
    >
        {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full" />
        )}
        <span
            className={`material-symbols-outlined text-xl transition-colors ${active ? 'text-blue-400' : 'group-hover:text-white/80'}`}
            style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
        >
            {item.icon}
        </span>
        <span className="text-sm font-medium flex-1">{item.label}</span>
        {item.badge && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {item.badge}
            </span>
        )}
    </Link>
);

export default Sidebar;

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles = {
    '/dashboard':     { title: 'Vista General',    subtitle: 'Resumen del sistema en tiempo real' },
    '/students':      { title: 'Estudiantes',       subtitle: 'Gestión y seguimiento de alumnos' },
    '/alerts':        { title: 'Alertas',           subtitle: 'Notificaciones y riesgos detectados por IA' },
    '/reports':       { title: 'Reportes',          subtitle: 'Análisis y estadísticas exportables' },
    '/attendance':    { title: 'Asistencias',       subtitle: 'Control de presencia diaria' },
    '/grades':        { title: 'Calificaciones',    subtitle: 'Rendimiento académico por materia' },
    '/interventions': { title: 'Intervenciones',    subtitle: 'Seguimiento de acciones correctivas' },
    '/settings':      { title: 'Configuración',     subtitle: 'Preferencias del sistema' },
};

const TopHeader = ({ title }) => {
    const location = useLocation();
    const [search, setSearch] = useState('');

    const meta = pageTitles[location.pathname] || { title, subtitle: '' };

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-outline-variant/50 shadow-sm">
            <div className="flex items-center justify-between h-16 px-6 gap-4">

                {/* Título */}
                <div className="flex flex-col justify-center min-w-0">
                    <h2 className="font-bold text-base text-on-surface leading-tight truncate">{meta.title}</h2>
                    {meta.subtitle && (
                        <p className="text-[11px] text-on-surface-variant hidden sm:block truncate">{meta.subtitle}</p>
                    )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 ml-auto">

                    {/* Buscador */}
                    <div className={`hidden md:flex items-center gap-2 bg-surface-container-low border rounded-xl px-3 py-1.5 transition-all duration-200 ${search ? 'border-primary ring-2 ring-primary/20 w-56' : 'border-outline-variant w-44 hover:border-outline'}`}>
                        <span className="material-symbols-outlined text-outline" style={{ fontSize: '18px' }}>search</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm w-full text-on-surface placeholder:text-outline/70 outline-none"
                            placeholder="Buscar..."
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-outline hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                            </button>
                        )}
                    </div>

                    {/* Notificaciones */}
                    <button className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white dot-pulse" />
                    </button>

                    {/* Avatar compacto */}
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-outline-variant cursor-pointer hover:ring-primary transition-all">
                        <img
                            className="w-full h-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLy6W1CbiTOl30EI1ejTMiO2IHu8ZJ-PJHY6fXkmbcElTSDs1GxkMZdH6m9vuFZLhmI5y_9QxbV81QAtRnko3HdDsytzY6dvbBkWPrZ2UolHgoattEQeFiu5NBnfDGM4LqMOMHdYKVaZbm-lSopgJg3dammPBfsOvc5KwdtMBBRCf6BbxxP6JtEB8LhJn5fE_mriEc5-tQE5L7a1LoBheTTq7ChlJb6emmMkusxtcqXeRfAe5Rr0YU-UKKl9s5vDkWoFIVHmK5o_73"
                            alt="Admin"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopHeader;

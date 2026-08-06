import React from 'react';
import TopHeader from '../components/TopHeader';

const statCards = [
    {
        label: 'Estudiantes en Riesgo',
        value: '42',
        delta: '+4% vs mes ant.',
        icon: 'trending_down',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        accentColor: 'from-red-500 to-rose-600',
        badge: 'bg-red-50 text-red-600 border border-red-100',
        note: 'Requiere intervención inmediata',
        noteIcon: 'info',
    },
    {
        label: 'Asistencia Promedio',
        value: '91.8%',
        delta: 'Meta: 95%',
        icon: 'event_available',
        iconBg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        accentColor: 'from-cyan-500 to-teal-500',
        badge: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
        progress: 91.8,
    },
    {
        label: 'Alertas IA Detectadas',
        value: '12',
        delta: '3 críticas · 9 preventivas',
        icon: 'warning',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        accentColor: 'from-blue-500 to-indigo-600',
        badge: 'bg-blue-50 text-blue-700 border border-blue-100',
    },
];

const DashboardPage = () => {
    return (
        <>
            <TopHeader title="Vista General" />
            <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">

                {/* Stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {statCards.map((card, i) => (
                        <div key={i} className="card stat-card p-6 flex flex-col gap-4 overflow-hidden relative">
                            {/* Gradiente decorativo */}
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.accentColor} opacity-5 rounded-full -translate-y-8 translate-x-8 pointer-events-none`} />

                            <div className="flex justify-between items-start">
                                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                    <span className={`material-symbols-outlined ${card.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {card.icon}
                                    </span>
                                </div>
                                <span className={`badge ${card.badge}`}>{card.delta}</span>
                            </div>

                            <div>
                                <p className="text-sm text-on-surface-variant font-medium">{card.label}</p>
                                <p className="text-4xl font-extrabold text-on-surface mt-0.5">{card.value}</p>
                            </div>

                            {card.progress !== undefined && (
                                <div>
                                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${card.accentColor} transition-all duration-700`}
                                            style={{ width: `${card.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {card.note && (
                                <p className="text-xs text-on-surface-variant flex items-center gap-1 -mt-1">
                                    <span className="material-symbols-outlined text-xs">{card.noteIcon}</span>
                                    {card.note}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Gráfico + Alertas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Gráfico de asistencia */}
                    <div className="lg:col-span-8 card p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-on-surface">Tendencias de Asistencia</h3>
                                <p className="text-sm text-on-surface-variant mt-0.5">Análisis predictivo basado en datos históricos</p>
                            </div>
                            <select className="bg-surface-container-low border border-outline-variant rounded-lg text-sm px-3 py-1.5 text-on-surface outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer">
                                <option>Últimos 30 días</option>
                                <option>Semestre Actual</option>
                            </select>
                        </div>

                        {/* Barras */}
                        <div className="flex items-end justify-between px-2 gap-2" style={{ height: '160px' }}>
                            {[
                                { val: 88, label: 'ENE' },
                                { val: 92, label: 'FEB' },
                                { val: 94, label: 'MAR' },
                                { val: 91, label: 'ABR' },
                                { val: 85, label: 'MAY' },
                                { val: 96, label: 'JUN', projected: true },
                            ].map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                    <div className="relative w-full flex items-end justify-center" style={{ height: '130px' }}>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none z-10">
                                            {m.projected ? `PROY. ${m.val}%` : `${m.val}%`}
                                        </div>
                                        <div
                                            className={`w-full rounded-t-lg transition-all duration-500 ${
                                                m.projected
                                                    ? 'bg-gradient-to-t from-cyan-500 to-teal-400 opacity-80 animate-pulse'
                                                    : 'bg-gradient-to-t from-blue-400 to-blue-300'
                                            } group-hover:opacity-90`}
                                            style={{ height: `${(m.val / 100) * 130}px` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-semibold ${m.projected ? 'text-cyan-600' : 'text-on-surface-variant'}`}>
                                        {m.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Leyenda */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-outline-variant/50">
                            <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-400 to-blue-300 inline-block" />
                                Real
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-cyan-600 font-semibold">
                                <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-cyan-500 to-teal-400 inline-block" />
                                Proyectado por IA
                            </span>
                        </div>
                    </div>

                    {/* Panel de alertas recientes */}
                    <div className="lg:col-span-4 card p-6 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-on-surface flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full dot-pulse" />
                                Últimas Alertas
                            </h3>
                            <span className="badge bg-red-50 text-red-600 border border-red-100">3 nuevas</span>
                        </div>

                        <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                            {[
                                {
                                    type: 'Deserción Potencial',
                                    title: 'Inactividad: Juan Pérez',
                                    desc: '4 días consecutivos de ausencia en 10º B.',
                                    color: 'bg-red-500',
                                    badgeColor: 'bg-red-50 text-red-600',
                                    time: 'Hace 2 h',
                                },
                                {
                                    type: 'Académico',
                                    title: 'Caída en Matemáticas',
                                    desc: 'Lucía Méndez descendió su promedio 35%.',
                                    color: 'bg-blue-500',
                                    badgeColor: 'bg-blue-50 text-blue-600',
                                    time: 'Hace 5 h',
                                },
                                {
                                    type: 'Preventiva',
                                    title: 'Bajo rendimiento grupal',
                                    desc: '8°C muestra tendencia descendente en Ciencias.',
                                    color: 'bg-amber-500',
                                    badgeColor: 'bg-amber-50 text-amber-700',
                                    time: 'Ayer',
                                },
                            ].map((alert, i) => (
                                <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:border-outline-variant transition-colors cursor-pointer group">
                                    <div className={`w-1 self-stretch rounded-full ${alert.color} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className={`badge ${alert.badgeColor} text-[10px]`}>{alert.type}</span>
                                            <span className="text-[10px] text-on-surface-variant">{alert.time}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-on-surface truncate">{alert.title}</p>
                                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{alert.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-4 w-full text-center text-sm text-primary font-semibold hover:underline py-2">
                            Ver todas las alertas →
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;

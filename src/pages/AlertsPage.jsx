import React from 'react';
import TopHeader from '../components/TopHeader';

const AlertsPage = () => (
    <>
        <TopHeader title="Centro de Alertas" />
        <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex gap-8 border-b border-outline-variant mb-6 sticky top-0 bg-background z-20 pt-2">
                <button className="pb-4 font-bold text-primary border-b-2 border-primary flex items-center gap-2">Críticas <span className="bg-error text-white text-[10px] px-2 rounded-full">12</span></button>
                <button className="pb-4 font-medium text-on-surface-variant flex items-center gap-2">Seguimiento <span className="bg-secondary text-white text-[10px] px-2 rounded-full">24</span></button>
            </div>
            {[1, 2].map((i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6 flex items-start gap-6">
                        <div className="w-1.5 h-16 bg-error rounded-full self-center"></div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-lg">Riesgo Inminente: {i === 1 ? 'Mateo Silva' : 'Elena Rojas'}</h3>
                                <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold">CRÍTICO</span>
                            </div>
                            <div className="flex gap-6 text-on-surface-variant">
                                <div className="flex items-center gap-1 text-sm"><span className="material-symbols-outlined text-sm">trending_down</span> Rendimiento: -35%</div>
                                <div className="flex items-center gap-1 text-sm"><span className="material-symbols-outlined text-sm">calendar_today</span> Inasistencia: 4 consec.</div>
                            </div>
                        </div>
                        <button className="p-2"><span className="material-symbols-outlined">expand_more</span></button>
                    </div>
                </div>
            ))}
        </div>
    </>
);

export default AlertsPage;

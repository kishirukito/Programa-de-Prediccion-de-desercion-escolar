import React from 'react';
import TopHeader from '../components/TopHeader';

const ReportsPage = () => {
    return (
        <>
            <TopHeader title="Módulo de Reportes" />
            <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
                        <div className="flex justify-between items-center mb-4"><span className="text-sm font-medium">Retención AI</span><span className="material-symbols-outlined text-secondary">trending_up</span></div>
                        <p className="text-4xl font-bold text-primary">94.2%</p>
                        <p className="text-xs text-on-surface-variant mt-2">Pronóstico semestre actual</p>
                    </div>
                    <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
                        <div className="flex justify-between items-center mb-4"><span className="text-sm font-medium">Riesgo</span><span className="material-symbols-outlined text-error">priority_high</span></div>
                        <p className="text-4xl font-bold">128</p>
                        <p className="text-xs text-on-surface-variant mt-2">-12 tras intervención</p>
                    </div>
                    <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
                        <div className="flex justify-between items-center mb-4"><span className="text-sm font-medium">Engagement</span><span className="material-symbols-outlined text-tertiary">bolt</span></div>
                        <p className="text-4xl font-bold">78%</p>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full mt-4 overflow-hidden"><div className="h-full bg-tertiary" style={{ width: '78%' }}></div></div>
                    </div>
                    <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
                        <div className="flex justify-between items-center mb-4"><span className="text-sm font-medium">Exitosas</span><span className="material-symbols-outlined text-primary">verified</span></div>
                        <p className="text-4xl font-bold">821</p>
                        <p className="text-xs text-on-surface-variant mt-2">Ciclo actual</p>
                    </div>
                </section>
                <div className="bg-surface rounded-xl border border-outline-variant p-6">
                    <h3 className="text-lg font-bold mb-6">Distribución de Riesgo Académico</h3>
                    <div className="h-64 flex items-end justify-around gap-4 px-4 relative">
                        <div className="w-12 bg-secondary rounded-t-lg h-[40%]"></div>
                        <div className="w-12 bg-secondary rounded-t-lg h-[60%]"></div>
                        <div className="w-12 bg-primary rounded-t-lg h-[85%]"></div>
                        <div className="w-12 bg-tertiary rounded-t-lg h-[45%]"></div>
                        <div className="w-12 bg-error rounded-t-lg h-[25%]"></div>
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-outline-variant"></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ReportsPage;

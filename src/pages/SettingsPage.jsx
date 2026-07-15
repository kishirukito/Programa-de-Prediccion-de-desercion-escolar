import React from 'react';
import TopHeader from '../components/TopHeader';

const SettingsPage = () => {
    return (
        <>
            <TopHeader title="Ajustes del Sistema" />
            <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8">
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-2"><span className="material-symbols-outlined text-primary">person</span> Datos del Administrador</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-on-surface-variant">Nombre Completo</label>
                            <input className="w-full border-outline-variant rounded-lg focus:ring-primary focus:border-primary" type="text" defaultValue="Dr. Javier Domínguez" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-on-surface-variant">Email Institucional</label>
                            <input className="w-full border-outline-variant rounded-lg focus:ring-primary focus:border-primary" type="email" defaultValue="j.dominguez@universidad.edu" />
                        </div>
                    </div>
                </section>
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-on-surface mb-8 flex items-center gap-2"><span className="material-symbols-outlined text-primary">psychology</span> Motor de IA y Riesgo</h2>
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div><h3 className="font-bold text-on-surface">Sensibilidad de Detección</h3><p className="text-xs text-on-surface-variant">Define qué tan agresivo debe ser el algoritmo.</p></div>
                                <span className="px-3 py-1 bg-primary-fixed text-primary rounded-full font-bold text-sm">75% (Alta)</span>
                            </div>
                            <input className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer" max="100" min="1" type="range" defaultValue="75" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant">
                            <div className="flex gap-3"><span className="material-symbols-outlined text-secondary">analytics</span><div><p className="text-sm font-bold">Análisis Predictivo Real-Time</p><p className="text-xs text-on-surface-variant">Procesa datos semanalmente.</p></div></div>
                            <div className="w-11 h-6 bg-primary rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                        </div>
                    </div>
                </section>
                <div className="flex justify-end gap-4">
                    <button className="px-6 py-3 font-bold hover:bg-surface-container-high rounded-xl">Descartar</button>
                    <button className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg active:scale-95 transition-all">Guardar Ajustes</button>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;

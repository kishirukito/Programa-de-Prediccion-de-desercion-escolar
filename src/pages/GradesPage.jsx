import React from 'react';
import TopHeader from '../components/TopHeader';

const GradesPage = () => (
    <>
        <TopHeader title="Módulo de Calificaciones" />
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-sm text-on-surface-variant font-medium">Promedio General</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-5xl font-bold text-primary">4.2</span>
                            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">+0.3 vs periodo ant.</span>
                        </div>
                    </div>
                    <div className="mt-8">
                        <div className="w-full bg-surface-container rounded-full h-2"><div className="bg-primary h-2 rounded-full w-[84%]"></div></div>
                    </div>
                </div>
                <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary"><p className="text-xs font-bold opacity-60">BAJO RIESGO</p><p className="text-2xl font-bold">28</p></div>
                        <div className="p-4 bg-surface-container-low rounded-lg border-l-4 border-tertiary"><p className="text-xs font-bold opacity-60">RIESGO MODERADO</p><p className="text-2xl font-bold">9</p></div>
                        <div className="p-4 bg-surface-container-low rounded-lg border-l-4 border-error"><p className="text-xs font-bold opacity-60">RIESGO CRÍTICO</p><p className="text-2xl font-bold">5</p></div>
                    </div>
                </div>
            </div>
        </div>
    </>
);

export default GradesPage;

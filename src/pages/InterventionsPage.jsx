import React from 'react';
import TopHeader from '../components/TopHeader';

const InterventionsPage = () => (
    <>
        <TopHeader title="Gestión de Intervenciones" />
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Casos Activos', count: 42, color: 'border-primary', hColor: 'bg-primary', w: '3/4' },
                    { label: 'En Seguimiento', count: 128, color: 'border-secondary', hColor: 'bg-secondary', w: '1/2' },
                    { label: 'Riesgo Crítico', count: 15, color: 'border-tertiary', hColor: 'bg-tertiary', w: '1/4' },
                    { label: 'Cerradas (Mes)', count: 89, color: 'border-green-500', hColor: 'bg-green-500', w: 'full' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${stat.color}`}>
                        <p className="text-on-surface-variant text-sm font-medium">{stat.label}</p>
                        <h2 className="text-3xl font-bold mt-1">{stat.count}</h2>
                        <div className="mt-4 h-1 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full ${stat.hColor} w-${stat.w}`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </>
);

export default InterventionsPage;

import React, { useState } from 'react';
import TopHeader from '../components/TopHeader';

const StudentsPage = () => {
    const [view, setView] = useState('table');
    return (
        <>
            <TopHeader title="Gestión de Estudiantes" />
            <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h3 className="text-3xl font-bold text-on-surface">Base de Datos de Estudiantes</h3>
                        <p className="text-on-surface-variant">Monitoreo de rendimiento asistido por IA en tiempo real.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant">
                            <button onClick={() => setView('table')} className={`p-2 rounded ${view === 'table' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined">view_list</span></button>
                            <button onClick={() => setView('grid')} className={`p-2 rounded ${view === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}><span className="material-symbols-outlined">grid_view</span></button>
                        </div>
                        <button className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-bold shadow-md"><span className="material-symbols-outlined">person_add</span> Añadir</button>
                    </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                                <th className="p-4">Estudiante</th>
                                <th className="p-4">Programa</th>
                                <th className="p-4">Estado IA</th>
                                <th className="p-4 text-center">Rendimiento</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                            {[
                                { name: 'Elena Martínez', email: 'elena.mtz@edu.predict', id: '#2024-0412', prog: 'Ing. Civil', status: 'RIESGO CRÍTICO', risk: 42, color: 'bg-error-container text-on-error-container', dot: 'bg-error' },
                                { name: 'Ricardo Gómez', email: 'r.gomez@edu.predict', id: '#2024-0985', prog: 'Psicología', status: 'ALERTA TEMPRANA', risk: 68, color: 'bg-tertiary-container/20 text-tertiary', dot: 'bg-tertiary' },
                                { name: 'Sofía Ortiz', email: 's.ortiz@edu.predict', id: '#2024-1122', prog: 'Sistemas', status: 'ESTABLE', risk: 94, color: 'bg-secondary-container text-on-secondary-container', dot: 'bg-secondary' },
                            ].map((std, i) => (
                                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${std.color}`}>{std.name.split(' ').map(n => n[0]).join('')}</div>
                                            <div><p className="font-bold text-on-surface">{std.name}</p><p className="text-xs text-on-surface-variant">{std.email}</p></div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">{std.prog}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${std.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${std.dot}`}></span> {std.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                                            <span className="text-xs font-bold">{std.risk}%</span>
                                            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                                <div className={`h-full ${std.dot}`} style={{ width: `${std.risk}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="p-2 hover:bg-surface-container-high rounded-lg"><span className="material-symbols-outlined text-outline">more_vert</span></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default StudentsPage;

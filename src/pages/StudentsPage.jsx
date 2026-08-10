import React, { useState } from 'react';
import TopHeader from '../components/TopHeader';

const initialStudents = [
    { name: 'Elena Martínez', email: 'elena.mtz@edu.predict', id: '#2024-0412', prog: 'Ing. Civil', status: 'RIESGO CRÍTICO', risk: 42, color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    { name: 'Ricardo Gómez', email: 'r.gomez@edu.predict', id: '#2024-0985', prog: 'Psicología', status: 'ALERTA TEMPRANA', risk: 68, color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
    { name: 'Sofía Ortiz', email: 's.ortiz@edu.predict', id: '#2024-1122', prog: 'Sistemas', status: 'ESTABLE', risk: 94, color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { name: 'Carlos Mendoza', email: 'c.mendoza@edu.predict', id: '#2024-1540', prog: 'Mecatrónica', status: 'RIESGO CRÍTICO', risk: 38, color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    { name: 'Mariana López', email: 'm.lopez@edu.predict', id: '#2024-0721', prog: 'Industrial', status: 'ESTABLE', risk: 91, color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { name: 'Gabriel Torres', email: 'g.torres@edu.predict', id: '#2024-2033', prog: 'Sistemas', status: 'ALERTA TEMPRANA', risk: 72, color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
];

const StudentsPage = () => {
    const [view, setView] = useState('table');
    const [students, setStudents] = useState(initialStudents);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [newStudent, setNewStudent] = useState({
        name: '',
        email: '',
        prog: 'Sistemas',
        status: 'ESTABLE',
        risk: 85
    });

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.prog.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleAddStudent = (e) => {
        e.preventDefault();
        if (!newStudent.name || !newStudent.email) return;

        let color = 'bg-emerald-100 text-emerald-700';
        let dot = 'bg-emerald-500';
        if (newStudent.status === 'RIESGO CRÍTICO') {
            color = 'bg-red-100 text-red-700';
            dot = 'bg-red-500';
        } else if (newStudent.status === 'ALERTA TEMPRANA') {
            color = 'bg-amber-100 text-amber-800';
            dot = 'bg-amber-500';
        }

        const idNum = Math.floor(1000 + Math.random() * 9000);
        const created = {
            ...newStudent,
            id: `#2024-${idNum}`,
            risk: Number(newStudent.risk),
            color,
            dot
        };

        setStudents([created, ...students]);
        setIsAddModalOpen(false);
        setNewStudent({ name: '', email: '', prog: 'Sistemas', status: 'ESTABLE', risk: 85 });
    };

    return (
        <>
            <TopHeader title="Gestión de Estudiantes" />
            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fade-in-up">
                
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-on-surface">Base de Datos de Estudiantes</h3>
                        <p className="text-sm text-on-surface-variant">Monitoreo de rendimiento asistido por IA en tiempo real.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant">
                            <button
                                onClick={() => setView('table')}
                                title="Vista de lista"
                                className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-white text-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                <span className="material-symbols-outlined text-xl">view_list</span>
                            </button>
                            <button
                                onClick={() => setView('grid')}
                                title="Vista de cuadrícula"
                                className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white text-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                <span className="material-symbols-outlined text-xl">grid_view</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-primary"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Añadir Estudiante
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar estudiante, correo o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <span className="text-xs font-semibold text-on-surface-variant uppercase whitespace-nowrap">Filtrar por:</span>
                        {['TODOS', 'RIESGO CRÍTICO', 'ALERTA TEMPRANA', 'ESTABLE'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                    statusFilter === st
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-surface-container-low text-on-surface-variant border border-outline-variant hover:bg-surface-container-high'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table View */}
                {view === 'table' ? (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                                        <th className="p-4">Estudiante</th>
                                        <th className="p-4">Programa</th>
                                        <th className="p-4">Estado IA</th>
                                        <th className="p-4 text-center">Rendimiento</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/60">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((std, i) => (
                                            <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${std.color}`}>
                                                            {std.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-on-surface text-sm">{std.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-on-surface-variant">{std.email}</span>
                                                                <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-mono text-outline">{std.id}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm font-medium text-on-surface">{std.prog}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${std.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${std.dot}`} />
                                                        {std.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col items-center gap-1 w-28 mx-auto">
                                                        <span className="text-xs font-bold text-on-surface">{std.risk}%</span>
                                                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                                            <div className={`h-full ${std.dot}`} style={{ width: `${std.risk}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="p-2 hover:bg-surface-container-high rounded-lg text-outline hover:text-on-surface transition-colors">
                                                        <span className="material-symbols-outlined text-lg">more_vert</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-on-surface-variant">
                                                No se encontraron estudiantes que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredStudents.map((std, i) => (
                            <div key={i} className="card p-5 flex flex-col justify-between gap-4 relative overflow-hidden group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${std.color}`}>
                                            {std.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">{std.name}</h4>
                                            <p className="text-xs text-on-surface-variant">{std.prog}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-outline bg-surface-container px-2 py-0.5 rounded-md">{std.id}</span>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-outline-variant/50">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-on-surface-variant">Estado IA:</span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${std.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${std.dot}`} />
                                            {std.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-on-surface-variant">Rendimiento:</span>
                                            <span className="text-on-surface">{std.risk}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                                            <div className={`h-full ${std.dot}`} style={{ width: `${std.risk}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-xs text-on-surface-variant truncate max-w-[180px]">{std.email}</span>
                                    <button className="text-xs font-semibold text-primary hover:underline">Ver Expediente →</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Añadir Estudiante */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant space-y-4">
                        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                            <h3 className="text-lg font-bold text-on-surface">Añadir Nuevo Estudiante</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-outline hover:text-on-surface transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Ana María Torres"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Correo Institucional</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="ejemplo@edu.predict"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Programa</label>
                                    <select
                                        value={newStudent.prog}
                                        onChange={(e) => setNewStudent({ ...newStudent, prog: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none"
                                    >
                                        <option value="Sistemas">Sistemas</option>
                                        <option value="Ing. Civil">Ing. Civil</option>
                                        <option value="Psicología">Psicología</option>
                                        <option value="Mecatrónica">Mecatrónica</option>
                                        <option value="Industrial">Industrial</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Estado IA</label>
                                    <select
                                        value={newStudent.status}
                                        onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none"
                                    >
                                        <option value="ESTABLE">ESTABLE</option>
                                        <option value="ALERTA TEMPRANA">ALERTA TEMPRANA</option>
                                        <option value="RIESGO CRÍTICO">RIESGO CRÍTICO</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Rendimiento Estimado ({newStudent.risk}%)</label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={newStudent.risk}
                                    onChange={(e) => setNewStudent({ ...newStudent, risk: e.target.value })}
                                    className="w-full accent-primary cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary py-2 px-5 text-sm"
                                >
                                    Guardar Estudiante
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudentsPage;

import React, { useState, useEffect } from 'react';
import TopHeader from '../components/TopHeader';
import { api } from '../api';

// Map API nivel_riesgo → display properties
const RIESGO_MAP = {
  critico:   { label: 'RIESGO CRÍTICO',  color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  alto:      { label: 'RIESGO ALTO',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medio:     { label: 'ALERTA TEMPRANA', color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  bajo:      { label: 'ESTABLE',         color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  sin_datos: { label: 'SIN DATOS',       color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
};

function nivelProps(nivel_riesgo) {
  return RIESGO_MAP[nivel_riesgo] || RIESGO_MAP.sin_datos;
}

// Map API student → display shape
function mapStudent(a) {
  const props = nivelProps(a.nivel_riesgo);
  const risk = a.porcentaje_asistencia != null
    ? Math.round(a.porcentaje_asistencia)
    : (a.promedio_general != null ? Math.round((a.promedio_general / 10) * 100) : 0);
  return {
    id:     a.id,
    name:   `${a.nombre} ${a.apellido_paterno}`.trim(),
    email:  a.matricula || '—',
    matId:  a.matricula,
    prog:   a.carrera_nombre || a.carrera_clave || '—',
    status: props.label,
    risk,
    color:  props.color,
    dot:    props.dot,
    nivel_riesgo: a.nivel_riesgo,
    promedio: a.promedio_general,
    asistencia: a.porcentaje_asistencia,
  };
}

const STATUS_FILTERS = ['TODOS', 'RIESGO CRÍTICO', 'RIESGO ALTO', 'ALERTA TEMPRANA', 'ESTABLE'];

const StudentsPage = () => {
    const [view, setView] = useState('table');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.expedientes();
                if (res?.success) {
                    setStudents((res.data || []).map(mapStudent));
                } else {
                    setError(res?.message || 'No se pudieron cargar los estudiantes.');
                }
            } catch (e) {
                console.error(e);
                setError(e.message || 'Error de conexión con el servidor.');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, []);

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.prog.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, matrícula o carrera..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <span className="text-xs font-semibold text-on-surface-variant uppercase whitespace-nowrap">Filtrar por:</span>
                        {STATUS_FILTERS.map((st) => (
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

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">error</span>
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="card p-12 flex items-center justify-center gap-3 text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                        Cargando estudiantes...
                    </div>
                ) : view === 'table' ? (
                    /* Table View */
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                                        <th className="p-4">Estudiante</th>
                                        <th className="p-4">Carrera</th>
                                        <th className="p-4">Estado IA</th>
                                        <th className="p-4 text-center">Asistencia</th>
                                        <th className="p-4 text-center">Promedio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/60">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((std) => (
                                            <tr key={std.id} className="hover:bg-surface-container-low/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${std.color}`}>
                                                            {std.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-on-surface text-sm">{std.name}</p>
                                                            <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-mono text-outline">{std.matId}</span>
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
                                                        <span className="text-xs font-bold text-on-surface">
                                                            {std.asistencia != null ? `${std.asistencia}%` : '—'}
                                                        </span>
                                                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                                            <div className={`h-full ${std.dot}`} style={{ width: `${std.asistencia ?? 0}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center text-sm font-bold text-on-surface">
                                                    {std.promedio != null ? std.promedio.toFixed(1) : '—'}
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
                        <div className="px-4 py-2 border-t border-outline-variant bg-surface-container-low text-xs text-on-surface-variant">
                            {filteredStudents.length} de {students.length} estudiantes
                        </div>
                    </div>
                ) : (
                    /* Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredStudents.map((std) => (
                            <div key={std.id} className="card p-5 flex flex-col justify-between gap-4 relative overflow-hidden group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${std.color}`}>
                                            {std.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">{std.name}</h4>
                                            <p className="text-xs text-on-surface-variant">{std.prog}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-outline bg-surface-container px-2 py-0.5 rounded-md">{std.matId}</span>
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
                                            <span className="text-on-surface-variant">Asistencia:</span>
                                            <span className="text-on-surface">{std.asistencia != null ? `${std.asistencia}%` : '—'}</span>
                                        </div>
                                        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                                            <div className={`h-full ${std.dot}`} style={{ width: `${std.asistencia ?? 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-on-surface-variant">Promedio:</span>
                                        <span className="text-on-surface">{std.promedio != null ? std.promedio.toFixed(1) : '—'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredStudents.length === 0 && (
                            <div className="col-span-full p-8 text-center text-on-surface-variant">
                                No se encontraron estudiantes que coincidan con la búsqueda.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default StudentsPage;

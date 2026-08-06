import React from 'react';
import TopHeader from '../components/TopHeader';

const AttendancePage = () => (
    <>
        <TopHeader title="Gestión de Asistencias" />
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="bg-primary-container text-on-primary-container rounded-xl p-8 flex flex-col justify-between shadow-lg">
                <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-5xl opacity-50">event_available</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">+4.2% vs. mes pasado</span>
                </div>
                <div className="mt-8">
                    <p className="text-lg opacity-80">Asistencia Global</p>
                    <h2 className="text-5xl font-bold">92.4%</h2>
                </div>
            </div>
        </div>
    </>
);

export default AttendancePage;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AlertsPage from './pages/AlertsPage';
import AttendancePage from './pages/AttendancePage';
import GradesPage from './pages/GradesPage';
import InterventionsPage from './pages/InterventionsPage';

const ProtectedRoute = () => {
    const token = localStorage.getItem('token');
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<Navigate to="/landing" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/landing" element={<LandingPage />} />

                {/* Rutas protegidas (con Sidebar y Header) */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/students" element={<StudentsPage />} />
                        <Route path="/alerts" element={<AlertsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/grades" element={<GradesPage />} />
                        <Route path="/interventions" element={<InterventionsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

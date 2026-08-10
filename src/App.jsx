import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExpedientesPage from './pages/ExpedientesPage';
import CapturPage from './pages/CapturPage';
import AlertasPage from './pages/AlertasPage';
import UsuariosPage from './pages/UsuariosPage';
import RolesPage from './pages/RolesPage';
import DocentesPage from './pages/DocentesPage';
import ReportesPage from './pages/ReportesPage';

import BaseDatosPage from './pages/BaseDatosPage';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expedientes" element={<ExpedientesPage />} />
            <Route path="/captura" element={<CapturPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/docentes" element={<DocentesPage />} />
            <Route path="/reportes"   element={<ReportesPage />} />
            <Route path="/basedatos" element={<BaseDatosPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

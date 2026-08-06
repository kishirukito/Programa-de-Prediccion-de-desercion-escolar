import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

const MainLayout = () => {
    return (
        <div className="flex min-h-screen" style={{ background: '#f0f4ff' }}>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar">
                <Outlet />
                <MobileNav />
            </main>
        </div>
    );
};

export default MainLayout;

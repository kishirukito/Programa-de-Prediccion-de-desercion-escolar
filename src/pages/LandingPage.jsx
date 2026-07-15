import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-background text-on-background min-h-screen">
            <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant shadow-sm flex items-center justify-between px-6 h-16">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">EduPredict AI</span>
                </div>
                <nav className="hidden md:flex gap-8">
                    <a className="text-sm font-medium text-primary hover:bg-surface-container-high px-2 py-1 rounded" href="#">Soluciones</a>
                    <a className="text-sm font-medium text-on-surface-variant hover:bg-surface-container-high px-2 py-1 rounded" href="#">Metodología</a>
                    <a className="text-sm font-medium text-on-surface-variant hover:bg-surface-container-high px-2 py-1 rounded" href="#">Impacto</a>
                </nav>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/login')} className="text-sm font-bold text-primary">Iniciar Sesión</button>
                    <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary text-sm font-bold px-6 py-2 rounded-full shadow-md">Agendar Demo</button>
                </div>
            </header>
            <main className="pt-16">
                <section className="relative min-h-[819px] flex items-center overflow-hidden bg-surface-container-low">
                    <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                        <div className="md:col-span-7 flex flex-col justify-center">
                            <span className="inline-block bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold mb-6 w-fit">Predictive Intelligence</span>
                            <h1 className="text-5xl font-extrabold mb-6 leading-tight text-on-background">
                                Transformamos datos en <span className="text-primary">permanencia estudiantil</span>
                            </h1>
                            <p className="text-lg text-on-surface-variant mb-10 max-w-xl">
                                Nuestra IA identifica patrones de deserción antes de que ocurran. Proporcionamos alertas tempranas y recomendaciones accionables.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2">Explorar Plataforma <span className="material-symbols-outlined">trending_up</span></button>
                                <button className="bg-surface-container-highest text-on-surface px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 border border-outline-variant">Ver Impacto <span className="material-symbols-outlined">analytics</span></button>
                            </div>
                        </div>
                        <div className="md:col-span-5 relative hidden md:block">
                            <div className="glass-card p-8 rounded-xl shadow-lg">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="font-bold text-lg">Análisis de Riesgo</span>
                                    <span className="material-symbols-outlined text-primary">more_vert</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="h-24 bg-surface-container-high rounded-lg flex items-end px-4 gap-2">
                                        <div className="w-full bg-primary h-3/4 rounded-t-sm animate-pulse"></div>
                                        <div className="w-full bg-secondary h-1/2 rounded-t-sm"></div>
                                        <div className="w-full bg-primary-container h-5/6 rounded-t-sm"></div>
                                        <div className="w-full bg-tertiary h-2/3 rounded-t-sm"></div>
                                        <div className="w-full bg-primary h-4/5 rounded-t-sm"></div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-error-container text-on-error-container rounded-lg border-l-4 border-error">
                                        <div>
                                            <p className="font-bold text-sm">Alerta Crítica</p>
                                            <p className="text-xs opacity-80">32 estudiantes en riesgo detectados</p>
                                        </div>
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="bg-surface-container-low py-12 border-t border-outline-variant text-center">
                <p className="text-on-surface-variant text-sm">© 2026 EduPredict AI. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default LandingPage;

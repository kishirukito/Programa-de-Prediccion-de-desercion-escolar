import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [formErrors, setFormErrors] = useState({ email: '', password: '' });

    const validate = () => {
        let valid = true;
        const errs = { email: '', password: '' };
        
        if (!email.trim()) {
            errs.email = 'El correo electrónico es requerido';
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errs.email = 'Ingrese un correo electrónico válido';
            valid = false;
        }
        
        if (!password) {
            errs.password = 'La contraseña es requerida';
            valid = false;
        } else if (password.length < 6) {
            errs.password = 'La contraseña debe tener al menos 6 caracteres';
            valid = false;
        }
        
        setFormErrors(errs);
        return valid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (!validate()) return;
        
        setLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la autenticación');
            }
            
            // Guardar token y datos del usuario
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirigir al dashboard
            navigate('/dashboard');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-0"
             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}>

            {/* Orbes de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600 opacity-10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500 opacity-10 blur-[100px]" />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-indigo-600 opacity-8 blur-[80px]" />
            </div>

            <main className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 shadow-2xl rounded-2xl overflow-hidden"
                  style={{ minHeight: '600px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Panel izquierdo */}
                <section className="hidden md:flex md:col-span-7 flex-col justify-center p-12 relative overflow-hidden"
                         style={{ background: 'linear-gradient(135deg, rgba(26,86,219,0.9) 0%, rgba(14,165,233,0.7) 100%)' }}>
                    <div className="absolute inset-0 pointer-events-none"
                         style={{ backgroundImage: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />

                    <div className="relative z-10">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                            </div>
                            <h1 className="text-white text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                EduPredict <span className="text-cyan-300">AI</span>
                            </h1>
                        </div>

                        <h2 className="text-white text-4xl font-extrabold leading-tight mb-4"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Transformando datos<br />en éxito estudiantil.
                        </h2>
                        <p className="text-white/70 text-base leading-relaxed mb-10">
                            Analítica predictiva para identificar riesgos de deserción y potenciar el rendimiento académico de su institución.
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { val: '94%',    label: 'Precisión IA' },
                                { val: '+12k',   label: 'Estudiantes' },
                                { val: 'Real-time', label: 'Análisis' },
                            ].map((s, i) => (
                                <div key={i} className="rounded-xl p-4 text-center"
                                     style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                                    <div className="text-white font-extrabold text-xl mb-0.5">{s.val}</div>
                                    <div className="text-white/50 text-[10px] uppercase tracking-wider">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Imagen de fondo sutil */}
                    <img
                        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi534slK9U6bBpMpI1KbSFG5gcVoj2oKbQMSrmqT_gnRq9zJiUDPdFFKmj0zC3KJvUNwNW2kYqZCSfNzUfg6wQ4tR7_8RI9J1CdyQ4DYWzYatQEEr0XiZjaW1iRi1-ZLJozdI637XeEW_bukrDJD1_0pXZbHQKI9bgT-gr1eMyPXNona27gciOhPANeZEIguVMWuEd08OqQeUHlo6IHX2anAggouDhaMxr8S9L2g9NByg1Bj6f4aJF5V5wNY31csH_XJkFxXe_K5xc"
                        alt="Campus"
                    />
                </section>

                {/* Panel derecho — Formulario */}
                <section className="col-span-1 md:col-span-5 flex flex-col justify-center p-8 md:p-10"
                         style={{ background: '#ffffff' }}>
                    <div className="w-full max-w-sm mx-auto">

                        {/* Logo mobile */}
                        <div className="md:hidden flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                            </div>
                            <span className="font-bold text-primary text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>EduPredict AI</span>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-on-surface" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Bienvenido de nuevo</h3>
                            <p className="text-on-surface-variant text-sm mt-1">Acceda a su panel de control institucional.</p>
                        </div>

                        {/* Alerta de Error General */}
                        {errorMsg && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                                <span className="material-symbols-outlined text-base">error</span>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block">
                                    Correo Institucional
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>mail</span>
                                    <input
                                        className={`w-full pl-10 pr-4 py-3 bg-surface-container-low border rounded-xl text-sm outline-none transition-all ${
                                            formErrors.email ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-outline-variant focus:ring-2 focus:ring-primary/30 focus:border-primary'
                                        }`}
                                        placeholder="director@universidad.edu"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                {formErrors.email && (
                                    <p className="text-xs text-red-500">{formErrors.email}</p>
                                )}
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Contraseña</label>
                                    <a className="text-xs text-primary hover:underline font-medium" href="#">¿Olvidó su contraseña?</a>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>lock</span>
                                    <input
                                        className={`w-full pl-10 pr-10 py-3 bg-surface-container-low border rounded-xl text-sm outline-none transition-all ${
                                            formErrors.password ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-outline-variant focus:ring-2 focus:ring-primary/30 focus:border-primary'
                                        }`}
                                        placeholder="••••••••"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {formErrors.password && (
                                    <p className="text-xs text-red-500">{formErrors.password}</p>
                                )}
                            </div>

                            <button 
                                className="btn-primary w-full mt-2 py-3.5 text-base flex items-center justify-center gap-2" 
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                        Iniciando sesión...
                                    </>
                                ) : (
                                    <>
                                        Iniciar Sesión
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divisor */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-outline-variant" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-white text-on-surface-variant">O continuar con</span>
                            </div>
                        </div>

                        {/* SSO */}
                        <button
                            className="w-full py-3 bg-white hover:bg-surface-container-low text-on-surface text-sm font-medium rounded-xl border border-outline-variant flex items-center justify-center gap-3 transition-all hover:shadow-sm"
                            type="button"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            SSO Institucional (Google)
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default LoginPage;

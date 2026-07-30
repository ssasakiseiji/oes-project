import { useState, type FormEvent } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { LoginResponse } from '../types/api';

// Ver comentario equivalente en api.ts sobre por qué ?? y no ||.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

interface LoginPageProps {
    onLoginSuccess: (response: LoginResponse) => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            onLoginSuccess(data);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
            <div className="w-full max-w-sm">
                {/* Hero */}
                <div
                    className="relative overflow-hidden rounded-t-3xl px-7 pt-10 pb-9"
                    style={{ background: 'linear-gradient(160deg, var(--color-section) 0%, var(--color-section-glow) 55%, var(--color-bg) 100%)' }}
                >
                    <div
                        className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(145,132,217,.35), transparent 70%)' }}
                    />
                    <div className="relative mb-3.5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/10">
                        <TrendingUp size={20} className="text-ink" strokeWidth={2.5} />
                    </div>
                    <h1 className="relative mb-1 text-2xl font-medium text-ink">Portal IPC</h1>
                    <p className="relative text-[13px] text-ink/65">Índice de Precios al Consumidor</p>
                </div>

                {/* Form sheet -- overlaps the hero, matches the mockup's -18px overlap */}
                <div className="card elev-lg relative -mt-[18px] rounded-t-none px-6 pt-7 pb-6">
                    <h2 className="mb-5 text-lg font-medium text-ink">Iniciar sesión</h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="field">
                            <label htmlFor="email">Correo electrónico</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input"
                                placeholder="tu@email.com"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div
                                className="rounded-md px-3 py-2 text-sm"
                                style={{
                                    background: 'color-mix(in srgb, #f87171 15%, transparent)',
                                    color: '#fca5a5',
                                    border: '1px solid color-mix(in srgb, #f87171 35%, transparent)',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Ingresando...</span>
                                </>
                            ) : (
                                <span>Iniciar sesión</span>
                            )}
                        </button>

                        <p className="text-muted mt-1 text-center text-xs">¿Olvidaste tu contraseña?</p>
                    </form>
                </div>

                <p className="text-muted mt-6 text-center text-xs">Portal IPC - Universidad Nacional de Itapúa</p>
                <p className="text-muted mt-2 text-center text-sm">¿Problemas para acceder? Contacta a tu administrador</p>
            </div>
        </div>
    );
}

export default LoginPage;

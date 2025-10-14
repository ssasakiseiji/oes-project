import React, { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function LoginPage({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
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
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col justify-center items-center p-4 text-white">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <ShoppingBasket className="mx-auto h-16 w-auto text-white" />
                    <h1 className="text-5xl font-extrabold mt-4">InflaciónApp</h1>
                    <p className="mt-2 text-white/80">Inicia sesión para continuar.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/30">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="text-sm font-bold tracking-wide">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-lg py-2 bg-transparent border-b-2 border-white/50 focus:outline-none focus:border-white transition" placeholder="tu@email.com" />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-bold tracking-wide">Contraseña</label>
                            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-lg py-2 bg-transparent border-b-2 border-white/50 focus:outline-none focus:border-white transition" placeholder="••••••••" />
                        </div>
                        {error && <p className="text-red-300 text-sm text-center bg-red-900/50 p-2 rounded-md">{error}</p>}
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center bg-white text-blue-600 p-4 rounded-full tracking-wide font-semibold focus:outline-none focus:shadow-outline hover:bg-blue-50 shadow-lg cursor-pointer transition ease-in duration-300 disabled:opacity-50">
                                {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { LoginResponse } from '../types/api';

// Ver comentario equivalente en api.ts sobre por qué ?? y no ||.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

interface LoginPageProps {
    onLoginSuccess: (response: LoginResponse) => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
    // email/password NO viven en estado de React, a diferencia del resto de los
    // formularios de la app: estos dos son los únicos que el navegador
    // autocompleta. El autocompletado escribe directo en el DOM y no siempre
    // dispara onChange -- sobre todo cuando ocurre durante la carga de la
    // página -- así que con inputs controlados el estado quedaba vacío y, peor,
    // el siguiente render de React pisaba el valor autocompletado con ese
    // string vacío. El usuario veía sus credenciales, mandaba "" y "", y el
    // backend contestaba "Credenciales incorrectas" (ver el sondeo en api.ts).
    // Dejando el DOM como única fuente de verdad no hay nada que
    // desincronizar; el label flotante no los necesita porque se posiciona con
    // :placeholder-shown, que también lee el DOM.
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Se lee antes de cualquier await: currentTarget queda en null apenas
        // el handler cede el control.
        const submitted = new FormData(e.currentTarget);
        const submittedEmail = String(submitted.get('email') ?? '');
        const submittedPassword = String(submitted.get('password') ?? '');

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: submittedEmail, password: submittedPassword }),
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
        // Sin card ni hero: la pantalla es el fondo desnudo y todo se lee por
        // contraste contra él -- el título por brillo, los campos por su borde,
        // el botón por ser la única superficie llena.
        <div className="flex min-h-screen items-center justify-center px-6 py-12" style={{ background: 'var(--color-bg)' }}>
            <div className="w-full max-w-[360px]">
                <header className="mb-9 text-center">
                    <p className="card-kicker mb-4">Plataforma de Investigación</p>
                    {/* text-balance: a este ancho el título entra en dos líneas
                        y sin balancear la segunda queda en una sola palabra
                        huérfana. */}
                    <h1 className="text-accent text-[32px] leading-[1.15] font-semibold tracking-tight text-balance">
                        Inicia sesión en tu cuenta.
                    </h1>
                    <p className="text-muted mt-3 text-sm">Hola, bienvenido de vuelta a tu cuenta</p>
                </header>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* El <label> va después del <input> a propósito: .field-float
                        lo posiciona sobre el borde con un selector de hermano
                        adyacente (ver nocturne.css). placeholder=" " es lo que
                        hace que :placeholder-shown detecte el campo vacío. */}
                    <div className="field-float">
                        {/* autoCapitalize/autoCorrect: los teclados de celular
                            capitalizan la primera letra, y el backend buscaba el
                            email sin normalizar -- "Juan@..." daba 401 con la
                            contraseña correcta. El backend ya normaliza (ver
                            common/validation/email.ts); esto ataca la causa
                            donde ocurre, así el usuario ve lo que escribió. */}
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="email"
                            spellCheck={false}
                            className="input"
                            placeholder=" "
                        />
                        <label htmlFor="email">Correo electrónico</label>
                    </div>

                    <div className="field-float">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className="input"
                            placeholder=" "
                        />
                        <label htmlFor="password">Contraseña</label>
                    </div>

                    {/* Sin rojo: el error se lee como un campo más del formulario,
                        por su borde contra el fondo desnudo. El borde va más
                        marcado que el de los inputs (35% vs 16% de ink) porque es
                        la única señal que queda de que algo salió mal. */}
                    {error && (
                        <div
                            role="alert"
                            className="text-accent rounded-[var(--nc-radius-md)] px-3 py-2 text-[13px]"
                            style={{
                                background: 'transparent',
                                border: '1px solid color-mix(in srgb, var(--color-ink) 35%, transparent)',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-solid mt-2 h-[52px] w-full rounded-[var(--nc-radius-lg)] text-sm"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Ingresando...</span>
                            </>
                        ) : (
                            <span>Iniciar sesión</span>
                        )}
                    </button>
                </form>

                <div className="hr mt-10" />
                <p className="text-muted text-center text-xs">¿Problemas para acceder? Contacta a tu administrador</p>
                <p className="text-muted mt-2 text-center text-[11px]">Universidad Nacional de Itapúa</p>
            </div>
        </div>
    );
}

export default LoginPage;

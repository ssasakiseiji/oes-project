// Obtener la URL base de la API desde las variables de entorno. Usa ?? (no
// ||) porque VITE_API_URL="" es un valor intencional (mismo origen, detrás
// de un proxy nginx que ya monta /api) — || lo trataría como "no seteado" y
// caería al fallback, duplicando el prefijo /api en cada request.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    skipAuthRedirect?: boolean;
}

// Sesión caída (token ausente, inválido o vencido). Antes esto se resolvía con
// `window.location.href = '/'`, una navegación completa del documento, y de ahí
// salía el bug de "no puedo volver a entrar sin refresh duro": al recargar, el
// navegador vuelve a autocompletar el formulario de login escribiendo en los
// inputs sin disparar onChange, así que el estado de React quedaba vacío
// mientras el usuario veía sus credenciales cargadas -- y el submit mandaba
// strings vacíos, que el backend contesta con "Credenciales incorrectas".
// Ahora se avisa por evento y App resetea la sesión en el mismo render, sin
// recargar el documento. (LoginPage además lee los valores del DOM, así que el
// autocompletado ya no puede desincronizarse; ver ahí.)
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

const resetSession = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
    // 1. Busca el token guardado en el navegador
    const token = localStorage.getItem('token');

    // 2. Prepara las cabeceras de la petición
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // 3. Si existe un token, lo añade a las cabeceras
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 4. Realiza la petición a la API con las cabeceras actualizadas
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    // 5. Manejo de errores HTTP
    if (!response.ok) {
        let errorMessage = 'Error en la petición a la API';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Si no se puede parsear el error, usar mensaje genérico
        }

        // 401 = token ausente → volver al login (salvo que se pida no hacerlo)
        if (response.status === 401) {
            if (!options.skipAuthRedirect) {
                resetSession();
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        // 403 = puede ser token expirado O un error de autorización diferente.
        // El backend contesta 403 "Token inválido o expirado" para un token
        // vencido (el 401 queda para el token ausente), así que este es el
        // camino real de una sesión que se cae sola con la pestaña abierta.
        if (response.status === 403) {
            if (errorMessage.toLowerCase().includes('token')) {
                if (!options.skipAuthRedirect) {
                    resetSession();
                }
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
            // Otros 403 (período cerrado, rol insuficiente, etc.) se propagan como error normal
        }

        throw new Error(errorMessage);
    }

    // Si la respuesta no tiene contenido (ej. en un DELETE), devuelve null
    if (response.status === 204) {
        return null as T;
    }

    return response.json();
}

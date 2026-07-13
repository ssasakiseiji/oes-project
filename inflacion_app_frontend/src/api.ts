// Obtener la URL base de la API desde las variables de entorno. Usa ?? (no
// ||) porque VITE_API_URL="" es un valor intencional (mismo origen, detrás
// de un proxy nginx que ya monta /api) — || lo trataría como "no seteado" y
// caería al fallback, duplicando el prefijo /api en cada request.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002';

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    skipAuthRedirect?: boolean;
}

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

        // 401 = token ausente → redirigir al login (salvo que se pida no hacerlo)
        if (response.status === 401) {
            if (!options.skipAuthRedirect) {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        // 403 = puede ser token expirado O un error de autorización diferente
        if (response.status === 403) {
            // Solo redirigir si es un error de token (auth.js devuelve "Token inválido o expirado")
            if (errorMessage.toLowerCase().includes('token')) {
                if (!options.skipAuthRedirect) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
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

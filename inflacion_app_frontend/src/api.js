// Obtener la URL base de la API desde las variables de entorno
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(url, options = {}) {
    // 1. Busca el token guardado en el navegador
    const token = localStorage.getItem('token');

    // 2. Prepara las cabeceras de la petición
    const headers = {
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
        // Token expirado o inválido - redirigir al login
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/';
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        // Otros errores
        let errorMessage = 'Error en la petición a la API';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Si no se puede parsear el error, usar mensaje genérico
        }

        throw new Error(errorMessage);
    }

    // Si la respuesta no tiene contenido (ej. en un DELETE), devuelve null
    if (response.status === 204) {
        return null;
    }

    return response.json();
}
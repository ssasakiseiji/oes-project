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
    const response = await fetch(`http://localhost:3001${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición a la API');
    }

    // Si la respuesta no tiene contenido (ej. en un DELETE), devuelve null
    if (response.status === 204) {
        return null;
    }

    return response.json();
}
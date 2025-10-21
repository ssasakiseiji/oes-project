import app from '../server.js';

// Handler para Vercel serverless
export default async function handler(req, res) {
    // Configurar CORS headers para todas las requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://ipc-portal.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si es preflight request (OPTIONS), responder inmediatamente
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Para otros métodos, pasar a Express
    return app(req, res);
}

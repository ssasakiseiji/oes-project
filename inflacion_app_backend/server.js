import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ipc-portal.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin origin (como mobile apps, Postman, curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Temporal: permitir todos los orígenes
        }
    },
    credentials: true
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.send('<h1>🚀 Backend de InflaciónApp está en línea y conectado a PostgreSQL!</h1>');
});

// API routes
app.use(routes);

// Error handling (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server solo si NO estamos en Vercel
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
}

// Export para Vercel
export default app;

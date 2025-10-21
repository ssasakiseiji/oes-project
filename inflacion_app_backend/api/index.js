import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from '../routes/index.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// CORS simple para Vercel
app.use(cors({
    origin: ['https://ipc-portal.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.send('<h1>🚀 Backend de InflaciónApp está en línea y conectado a PostgreSQL!</h1>');
});

// API routes
app.use(routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

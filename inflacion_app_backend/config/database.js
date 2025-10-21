import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    },
    // Configuración para Vercel Serverless + Supabase Session Mode
    max: 1, // Máximo 1 conexión por función serverless
    idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30 segundos
    connectionTimeoutMillis: 10000, // Timeout de conexión: 10 segundos
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;

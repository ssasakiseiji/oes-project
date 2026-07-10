import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DB_SSL=false para Postgres self-hosted en la red interna de Docker (VPS).
// Por defecto queda en true para mantener compatibilidad con el pooler de Supabase.
const useSsl = process.env.DB_SSL !== 'false';

export const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    // DB_POOL_MAX: en serverless (Vercel) conviene 1; en un proceso persistente (VPS) 10-20.
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30 segundos
    connectionTimeoutMillis: 10000, // Timeout de conexión: 10 segundos
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;

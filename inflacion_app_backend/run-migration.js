import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const migrationFile = process.argv[2] || 'migrations/002-prices-integrity.sql';
    const client = await pool.connect();
    try {
        console.log(`📦 Ejecutando migración: ${migrationFile}\n`);

        const migrationPath = path.join(__dirname, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');

        console.log('✅ Migración ejecutada exitosamente!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error ejecutando migración:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});

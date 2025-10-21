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
    const client = await pool.connect();
    try {
        console.log('📦 Ejecutando migración: add-commerce-assignments.sql\n');

        const migrationPath = path.join(__dirname, 'migrations', 'add-commerce-assignments.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');

        console.log('✅ Migración ejecutada exitosamente!\n');

        // Verify the results
        const result = await client.query(`
            SELECT
                u.name as student_name,
                COUNT(ca.commerce_id) as assigned_commerces
            FROM users u
            LEFT JOIN commerce_assignments ca ON u.id = ca.user_id
            WHERE 'student' = ANY(u.roles)
            GROUP BY u.id, u.name
            ORDER BY u.name
        `);

        console.log('📊 Asignaciones actuales:');
        console.log('═══════════════════════════════════════════════════════');
        result.rows.forEach(row => {
            console.log(`  ${row.student_name}: ${row.assigned_commerces} comercio(s) asignado(s)`);
        });
        console.log('═══════════════════════════════════════════════════════\n');

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

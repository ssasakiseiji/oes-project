import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setupDatabase() {
    const client = await pool.connect();
    try {
        console.log('📦 Conectando a la base de datos...');

        // Leer y ejecutar el schema
        console.log('📋 Creando tablas...');
        const schemaSQL = fs.readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schemaSQL);
        console.log('✅ Tablas creadas exitosamente');

        // Leer y ejecutar el seed
        console.log('🌱 Insertando datos de prueba...');
        const seedSQL = fs.readFileSync(join(__dirname, 'seed.sql'), 'utf8');
        await client.query(seedSQL);
        console.log('✅ Datos de prueba insertados exitosamente');

        console.log('\n🎉 Base de datos configurada correctamente!');
        console.log('\n📝 Usuarios de prueba creados:');
        console.log('   Admin:   admin@test.com   / password123');
        console.log('   Monitor: monitor@test.com / password123');
        console.log('   Estudiante 1: juan@test.com   / password123');
        console.log('   Estudiante 2: maria@test.com  / password123');
        console.log('   Estudiante 3: carlos@test.com / password123');

    } catch (error) {
        console.error('❌ Error al configurar la base de datos:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupDatabase().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});

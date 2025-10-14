import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function updatePasswords() {
    const client = await pool.connect();
    try {
        console.log('🔐 Generando hash para password123...');
        const passwordHash = await bcrypt.hash('password123', 10);
        console.log('Hash generado:', passwordHash);

        console.log('\n📝 Actualizando contraseñas de todos los usuarios...');

        const result = await client.query(
            'UPDATE users SET password_hash = $1',
            [passwordHash]
        );

        console.log(`✅ ${result.rowCount} usuarios actualizados`);
        console.log('\n🎉 Contraseñas actualizadas correctamente!');
        console.log('Ahora puedes iniciar sesión con cualquier usuario usando la contraseña: password123');

    } catch (error) {
        console.error('❌ Error al actualizar contraseñas:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

updatePasswords().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});

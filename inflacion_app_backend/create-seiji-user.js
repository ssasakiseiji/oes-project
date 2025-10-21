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

async function createSeijiUser() {
    const client = await pool.connect();
    try {
        console.log('🔐 Generando hash para password123...');
        const passwordHash = await bcrypt.hash('password123', 10);

        console.log('📝 Creando usuario ssasakiseiji@gmail.com...');

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['ssasakiseiji@gmail.com']
        );

        if (existingUser.rows.length > 0) {
            console.log('⚠️  Usuario ya existe. Actualizando contraseña...');
            await client.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2',
                [passwordHash, 'ssasakiseiji@gmail.com']
            );
            console.log('✅ Contraseña actualizada');
        } else {
            await client.query(
                'INSERT INTO users (name, email, password_hash, roles) VALUES ($1, $2, $3, $4)',
                ['Seiji Sasaki', 'ssasakiseiji@gmail.com', passwordHash, ['admin']]
            );
            console.log('✅ Usuario creado exitosamente');
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('CREDENCIALES DE ACCESO');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Email:    ssasakiseiji@gmail.com');
        console.log('Password: password123');
        console.log('Rol:      admin');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createSeijiUser().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});

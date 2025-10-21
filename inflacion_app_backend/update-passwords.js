import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

function generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

async function updatePasswords() {
    const client = await pool.connect();
    try {
        console.log('⚠️  ADVERTENCIA: Este script es solo para desarrollo local');
        console.log('⚠️  NO use este script en producción\n');

        // Get all users
        const usersResult = await client.query('SELECT id, name, email FROM users');
        const users = usersResult.rows;

        console.log(`📝 Generando contraseñas únicas para ${users.length} usuarios...\n`);

        const userCredentials = [];

        for (const user of users) {
            // Generate unique password for each user
            const password = generateSecurePassword(12);
            const passwordHash = await bcrypt.hash(password, 10);

            // Update user password
            await client.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [passwordHash, user.id]
            );

            userCredentials.push({
                name: user.name,
                email: user.email,
                password: password
            });

            console.log(`✅ ${user.name} (${user.email})`);
        }

        console.log('\n🎉 Contraseñas actualizadas correctamente!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('CREDENCIALES DE ACCESO (Guarde esto en un lugar seguro)');
        console.log('═══════════════════════════════════════════════════════\n');

        userCredentials.forEach(cred => {
            console.log(`👤 ${cred.name}`);
            console.log(`   Email:    ${cred.email}`);
            console.log(`   Password: ${cred.password}`);
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  Estas contraseñas solo se muestran UNA VEZ');
        console.log('⚠️  Guárdelas en un lugar seguro antes de cerrar esta ventana');
        console.log('═══════════════════════════════════════════════════════\n');

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

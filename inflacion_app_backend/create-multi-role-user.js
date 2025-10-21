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

async function createMultiRoleUser() {
    const client = await pool.connect();
    try {
        console.log('🔐 Generando hash para password123...');
        const passwordHash = await bcrypt.hash('password123', 10);

        console.log('📝 Creando usuario con múltiples roles...');

        // Update Seiji's user to have multiple roles
        const result = await client.query(
            'UPDATE users SET roles = $1 WHERE email = $2 RETURNING id, name, email, roles',
            [['admin', 'monitor', 'student'], 'ssasakiseiji@gmail.com']
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('✅ Usuario actualizado exitosamente\n');
            console.log('═══════════════════════════════════════════════════════');
            console.log('USUARIO CON MÚLTIPLES ROLES');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`Nombre:   ${user.name}`);
            console.log(`Email:    ${user.email}`);
            console.log(`Password: password123`);
            console.log(`Roles:    ${user.roles.join(', ')}`);
            console.log('═══════════════════════════════════════════════════════\n');
            console.log('💡 Ahora puedes cambiar entre roles haciendo clic en el badge del rol');
        } else {
            console.log('⚠️  Usuario no encontrado. Creando uno nuevo...');

            const newUser = await client.query(
                'INSERT INTO users (name, email, password_hash, roles) VALUES ($1, $2, $3, $4) RETURNING id, name, email, roles',
                ['Seiji Sasaki', 'ssasakiseiji@gmail.com', passwordHash, ['admin', 'monitor', 'student']]
            );

            const user = newUser.rows[0];
            console.log('✅ Usuario creado exitosamente\n');
            console.log('═══════════════════════════════════════════════════════');
            console.log('USUARIO CON MÚLTIPLES ROLES');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`Nombre:   ${user.name}`);
            console.log(`Email:    ${user.email}`);
            console.log(`Password: password123`);
            console.log(`Roles:    ${user.roles.join(', ')}`);
            console.log('═══════════════════════════════════════════════════════\n');
            console.log('💡 Ahora puedes cambiar entre roles haciendo clic en el badge del rol');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createMultiRoleUser().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});

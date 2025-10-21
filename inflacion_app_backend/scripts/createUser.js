import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { generateSecurePassword } from './generatePassword.js';
import readline from 'readline';

dotenv.config();

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createUser() {
    try {
        console.log('\n═══════════════════════════════════════');
        console.log('   Crear Nuevo Usuario');
        console.log('═══════════════════════════════════════\n');

        const name = await question('Nombre completo: ');
        const email = await question('Email: ');

        console.log('\nRoles disponibles:');
        console.log('1. student - Estudiante (recolector de precios)');
        console.log('2. monitor - Monitor (supervisor de estudiantes)');
        console.log('3. admin - Administrador (acceso completo)');
        console.log('4. student,monitor - Estudiante y Monitor');
        console.log('5. monitor,admin - Monitor y Administrador\n');

        const roleChoice = await question('Seleccione rol (1-5): ');

        const roleMap = {
            '1': ['student'],
            '2': ['monitor'],
            '3': ['admin'],
            '4': ['student', 'monitor'],
            '5': ['monitor', 'admin']
        };

        const roles = roleMap[roleChoice] || ['student'];

        const useAutoPassword = await question('\n¿Generar contraseña automática? (s/n): ');

        let password;
        if (useAutoPassword.toLowerCase() === 's') {
            password = generateSecurePassword(16);
            console.log('\n✅ Contraseña generada automáticamente');
        } else {
            password = await question('Ingrese contraseña: ');
            if (password.length < 8) {
                console.log('❌ La contraseña debe tener al menos 8 caracteres');
                rl.close();
                await pool.end();
                return;
            }
        }

        console.log('\n📝 Creando usuario...');

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, roles) VALUES ($1, $2, $3, $4) RETURNING id, name, email, roles',
            [name, email, passwordHash, roles]
        );

        const user = result.rows[0];

        console.log('\n═══════════════════════════════════════');
        console.log('   ✅ Usuario creado exitosamente');
        console.log('═══════════════════════════════════════\n');
        console.log(`ID:       ${user.id}`);
        console.log(`Nombre:   ${user.name}`);
        console.log(`Email:    ${user.email}`);
        console.log(`Roles:    ${user.roles.join(', ')}`);
        console.log(`Password: ${password}`);
        console.log('\n⚠️  Guarde estas credenciales en un lugar seguro\n');

    } catch (error) {
        if (error.code === '23505') {
            console.error('\n❌ Error: Ya existe un usuario con ese email');
        } else {
            console.error('\n❌ Error al crear usuario:', error.message);
        }
    } finally {
        rl.close();
        await pool.end();
    }
}

createUser();

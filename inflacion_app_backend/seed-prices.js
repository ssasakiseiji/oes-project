import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function seedPrices() {
    try {
        await client.connect();
        console.log('📊 Conectado a la base de datos...');

        // Registros de Precios para Octubre 2025 (Período activo)
        console.log('📝 Insertando registros para Juan Pérez - Octubre 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (25000, 4, 1, 3, 1, '2025-10-05 10:30:00'),
            (18000, 4, 2, 3, 1, '2025-10-05 10:32:00'),
            (35000, 4, 3, 3, 1, '2025-10-05 10:34:00'),
            (22000, 4, 4, 3, 1, '2025-10-05 10:36:00'),
            (8500, 4, 5, 3, 1, '2025-10-05 10:38:00'),
            (12000, 4, 6, 3, 1, '2025-10-05 10:40:00'),
            (45000, 4, 7, 3, 1, '2025-10-05 10:42:00'),
            (15000, 4, 8, 3, 1, '2025-10-05 10:44:00'),
            (18000, 4, 9, 3, 1, '2025-10-05 10:46:00'),
            (6000, 4, 10, 3, 1, '2025-10-05 10:48:00'),
            (12000, 4, 11, 3, 1, '2025-10-05 10:50:00'),
            (28000, 4, 12, 3, 1, '2025-10-05 10:52:00'),
            (5500, 4, 13, 3, 1, '2025-10-05 10:54:00'),
            (32000, 4, 14, 3, 1, '2025-10-05 10:56:00'),
            (18000, 4, 15, 3, 1, '2025-10-05 10:58:00'),
            (24500, 4, 1, 3, 2, '2025-10-06 14:20:00'),
            (17500, 4, 2, 3, 2, '2025-10-06 14:22:00'),
            (34000, 4, 3, 3, 2, '2025-10-06 14:24:00'),
            (21500, 4, 4, 3, 2, '2025-10-06 14:26:00'),
            (8000, 4, 5, 3, 2, '2025-10-06 14:28:00')
            ON CONFLICT DO NOTHING
        `);

        console.log('📝 Insertando registros para María García - Octubre 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (26000, 4, 1, 4, 3, '2025-10-07 09:15:00'),
            (19000, 4, 2, 4, 3, '2025-10-07 09:17:00'),
            (36000, 4, 3, 4, 3, '2025-10-07 09:19:00'),
            (23000, 4, 4, 4, 3, '2025-10-07 09:21:00'),
            (9000, 4, 5, 4, 3, '2025-10-07 09:23:00'),
            (13000, 4, 6, 4, 3, '2025-10-07 09:25:00'),
            (48000, 4, 7, 4, 3, '2025-10-07 09:27:00'),
            (16000, 4, 8, 4, 3, '2025-10-07 09:29:00'),
            (19000, 4, 9, 4, 3, '2025-10-07 09:31:00'),
            (6500, 4, 10, 4, 3, '2025-10-07 09:33:00'),
            (25500, 4, 1, 4, 4, '2025-10-08 16:00:00'),
            (18500, 4, 2, 4, 4, '2025-10-08 16:02:00'),
            (35500, 4, 3, 4, 4, '2025-10-08 16:04:00'),
            (22500, 4, 4, 4, 4, '2025-10-08 16:06:00'),
            (8700, 4, 5, 4, 4, '2025-10-08 16:08:00')
            ON CONFLICT DO NOTHING
        `);

        console.log('📝 Insertando registros para Carlos López - Octubre 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (25200, 4, 1, 5, 1, '2025-10-09 11:00:00'),
            (18200, 4, 2, 5, 1, '2025-10-09 11:02:00'),
            (35200, 4, 3, 5, 1, '2025-10-09 11:04:00'),
            (12500, 4, 6, 5, 1, '2025-10-09 11:06:00'),
            (46000, 4, 7, 5, 1, '2025-10-09 11:08:00'),
            (29000, 4, 12, 5, 1, '2025-10-09 11:10:00'),
            (33000, 4, 14, 5, 1, '2025-10-09 11:12:00'),
            (18500, 4, 15, 5, 1, '2025-10-09 11:14:00'),
            (24000, 4, 1, 5, 2, '2025-10-10 15:30:00'),
            (17000, 4, 2, 5, 2, '2025-10-10 15:32:00'),
            (33500, 4, 3, 5, 2, '2025-10-10 15:34:00'),
            (21000, 4, 4, 5, 2, '2025-10-10 15:36:00'),
            (7800, 4, 5, 5, 2, '2025-10-10 15:38:00'),
            (11800, 4, 6, 5, 2, '2025-10-10 15:40:00')
            ON CONFLICT DO NOTHING
        `);

        console.log('📝 Insertando registros históricos - Marzo 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (23000, 3, 1, 3, 1, '2025-03-05 10:30:00'),
            (16000, 3, 2, 3, 1, '2025-03-05 10:32:00'),
            (32000, 3, 3, 3, 1, '2025-03-05 10:34:00'),
            (20000, 3, 4, 3, 1, '2025-03-05 10:36:00'),
            (7500, 3, 5, 3, 1, '2025-03-05 10:38:00'),
            (11000, 3, 6, 3, 1, '2025-03-05 10:40:00'),
            (42000, 3, 7, 3, 1, '2025-03-05 10:42:00'),
            (14000, 3, 8, 3, 1, '2025-03-05 10:44:00'),
            (23500, 3, 1, 4, 3, '2025-03-07 09:15:00'),
            (16500, 3, 2, 4, 3, '2025-03-07 09:17:00'),
            (33000, 3, 3, 4, 3, '2025-03-07 09:19:00'),
            (20500, 3, 4, 4, 3, '2025-03-07 09:21:00'),
            (8000, 3, 5, 4, 3, '2025-03-07 09:23:00'),
            (23200, 3, 1, 5, 2, '2025-03-09 11:00:00'),
            (16200, 3, 2, 5, 2, '2025-03-09 11:02:00'),
            (32500, 3, 3, 5, 2, '2025-03-09 11:04:00'),
            (10500, 3, 6, 5, 2, '2025-03-09 11:06:00'),
            (43000, 3, 7, 5, 2, '2025-03-09 11:08:00')
            ON CONFLICT DO NOTHING
        `);

        console.log('📝 Insertando registros históricos - Febrero 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (22000, 2, 1, 3, 1, '2025-02-05 10:30:00'),
            (15500, 2, 2, 3, 1, '2025-02-05 10:32:00'),
            (31000, 2, 3, 3, 1, '2025-02-05 10:34:00'),
            (19500, 2, 4, 3, 1, '2025-02-05 10:36:00'),
            (10500, 2, 6, 3, 1, '2025-02-05 10:40:00'),
            (41000, 2, 7, 3, 1, '2025-02-05 10:42:00'),
            (22500, 2, 1, 4, 3, '2025-02-07 09:15:00'),
            (16000, 2, 2, 4, 3, '2025-02-07 09:17:00'),
            (31500, 2, 3, 4, 3, '2025-02-07 09:19:00'),
            (10800, 2, 6, 4, 3, '2025-02-07 09:25:00')
            ON CONFLICT DO NOTHING
        `);

        console.log('📝 Insertando registros históricos - Enero 2025...');
        await client.query(`
            INSERT INTO prices (price, period_id, product_id, user_id, commerce_id, created_at) VALUES
            (21000, 1, 1, 3, 1, '2025-01-05 10:30:00'),
            (15000, 1, 2, 3, 1, '2025-01-05 10:32:00'),
            (30000, 1, 3, 3, 1, '2025-01-05 10:34:00'),
            (19000, 1, 4, 3, 1, '2025-01-05 10:36:00'),
            (10000, 1, 6, 3, 1, '2025-01-05 10:40:00'),
            (40000, 1, 7, 3, 1, '2025-01-05 10:42:00'),
            (21500, 1, 1, 4, 3, '2025-01-07 09:15:00'),
            (15500, 1, 2, 4, 3, '2025-01-07 09:17:00'),
            (30500, 1, 3, 4, 3, '2025-01-07 09:19:00')
            ON CONFLICT DO NOTHING
        `);

        // Contar registros totales
        const result = await client.query('SELECT COUNT(*) FROM prices');
        const count = result.rows[0].count;

        console.log('\n✅ Seed completado exitosamente!');
        console.log(`📊 Total de registros de precios en la base de datos: ${count}`);
        console.log('\n📈 Resumen de datos de prueba:');
        console.log('   - Registros para Octubre 2025 (período activo): ~49 registros');
        console.log('   - Registros para Marzo 2025: ~18 registros');
        console.log('   - Registros para Febrero 2025: ~10 registros');
        console.log('   - Registros para Enero 2025: ~9 registros');
        console.log('   - Total insertado: ~86 registros de precios');
        console.log('\n🎯 Estudiantes con datos:');
        console.log('   - Juan Pérez (juan@test.com)');
        console.log('   - María García (maria@test.com)');
        console.log('   - Carlos López (carlos@test.com)');
        console.log('\n🏪 Comercios con datos:');
        console.log('   - Supermercado Central');
        console.log('   - Tienda La Economía');
        console.log('   - Minimarket San José');
        console.log('   - Supermercado Express');
        console.log('\n💡 Ahora puedes testear la exportación de datos en el panel de administrador!');

    } catch (error) {
        console.error('❌ Error al insertar datos:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

seedPrices();

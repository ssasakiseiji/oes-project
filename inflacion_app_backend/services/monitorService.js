import pool from '../config/database.js';

export const monitorService = {
    async getMonitorData() {
        const [periodsRes, studentsRes, productsRes] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            pool.query("SELECT id, name FROM users WHERE 'student' = ANY(roles)"),
            pool.query('SELECT id FROM products'),
        ]);

        const allPeriods = periodsRes.rows;
        const allStudents = studentsRes.rows;
        const totalProducts = productsRes.rows.length;

        const [pricesRes, draftsRes] = await Promise.all([
            pool.query(`
                SELECT pr.user_id, pr.commerce_id, pr.period_id, pr.product_id, pr.price, c.name as commerce_name
                FROM prices pr
                JOIN commerces c ON pr.commerce_id = c.id
            `),
            pool.query(`
                SELECT d.user_id, d.commerce_id, d.period_id, d.product_id, d.price, c.name as commerce_name
                FROM draft_prices d
                JOIN commerces c ON d.commerce_id = c.id
            `),
        ]);

        const monitorDataByPeriod = allPeriods.map(period => {
            const studentProgress = allStudents.map(student => {
                // Obtener comercios únicos donde el estudiante tiene registros (prices o drafts) en este período
                const studentCommercesInPeriod = new Set();

                pricesRes.rows
                    .filter(p => p.period_id === period.id && p.user_id === student.id)
                    .forEach(p => studentCommercesInPeriod.add(JSON.stringify({ id: p.commerce_id, name: p.commerce_name })));

                draftsRes.rows
                    .filter(d => d.period_id === period.id && d.user_id === student.id)
                    .forEach(d => studentCommercesInPeriod.add(JSON.stringify({ id: d.commerce_id, name: d.commerce_name })));

                // Convertir Set a array de objetos
                const commercesForStudent = Array.from(studentCommercesInPeriod)
                    .map(str => JSON.parse(str));

                // Si el estudiante no tiene registros en este período, no mostrar tareas
                const tasks = commercesForStudent.map(commerce => {
                    const submittedPrices = pricesRes.rows.filter(
                        p => p.period_id === period.id && p.user_id === student.id && p.commerce_id === commerce.id
                    );
                    const draftPrices = draftsRes.rows.filter(
                        d => d.period_id === period.id && d.user_id === student.id && d.commerce_id === commerce.id
                    );

                    let status = 'Pendiente';
                    if (submittedPrices.length >= totalProducts) {
                        status = 'Completado';
                    } else if (submittedPrices.length > 0 || draftPrices.length > 0) {
                        status = 'En Proceso';
                    }

                    const currentProgress = status === 'Completado'
                        ? totalProducts
                        : Math.max(submittedPrices.length, draftPrices.length);

                    return {
                        commerceId: commerce.id,
                        commerceName: commerce.name,
                        status,
                        progress: {
                            current: currentProgress,
                            total: totalProducts
                        },
                        draftPrices: draftPrices.reduce((acc, p) => {
                            acc[p.product_id] = p.price;
                            return acc;
                        }, {}),
                        submittedPrices: submittedPrices.reduce((acc, p) => {
                            acc[p.product_id] = p.price;
                            return acc;
                        }, {})
                    };
                });

                return {
                    studentId: student.id,
                    studentName: student.name,
                    tasks
                };
            });

            return {
                periodId: period.id,
                periodName: period.name,
                status: period.status,
                students: studentProgress
            };
        });

        return monitorDataByPeriod;
    }
};

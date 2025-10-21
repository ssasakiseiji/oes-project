import pool from '../config/database.js';

export const monitorService = {
    async getMonitorData() {
        const [periodsRes, studentsRes, commercesRes, productsRes] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            pool.query("SELECT id, name FROM users WHERE 'student' = ANY(roles)"),
            pool.query('SELECT id, name FROM commerces'),
            pool.query('SELECT id FROM products'),
        ]);

        const allPeriods = periodsRes.rows;
        const allStudents = studentsRes.rows;
        const allCommerces = commercesRes.rows;
        const totalProducts = productsRes.rows.length;

        const [pricesRes, draftsRes] = await Promise.all([
            pool.query('SELECT user_id, commerce_id, period_id, product_id, price FROM prices'),
            pool.query('SELECT user_id, commerce_id, period_id, product_id, price FROM draft_prices'),
        ]);

        const monitorDataByPeriod = allPeriods.map(period => {
            const studentProgress = allStudents.map(student => {
                const tasks = allCommerces.map(commerce => {
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

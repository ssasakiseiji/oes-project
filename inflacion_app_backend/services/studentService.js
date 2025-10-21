import pool from '../config/database.js';

export const studentService = {
    async getStudentTasks(userId) {
        const [productsRes, categoriesRes, commercesRes] = await Promise.all([
            pool.query('SELECT id, name, unit, category_id AS "categoryId" FROM products ORDER BY name'),
            pool.query('SELECT * FROM categories ORDER BY name'),
            // Only get commerces assigned to this student
            pool.query(`
                SELECT c.id, c.name, c.address
                FROM commerces c
                INNER JOIN commerce_assignments ca ON c.id = ca.commerce_id
                WHERE ca.user_id = $1
                ORDER BY c.name
            `, [userId]),
        ]);

        return {
            products: productsRes.rows,
            categories: categoriesRes.rows,
            assignedCommerces: commercesRes.rows,
        };
    },

    async getStudentDashboard(userId) {
        const [periodsRes, commercesRes] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            // Only get commerces assigned to this student
            pool.query(`
                SELECT c.id, c.name
                FROM commerces c
                INNER JOIN commerce_assignments ca ON c.id = ca.commerce_id
                WHERE ca.user_id = $1
                ORDER BY c.name
            `, [userId])
        ]);

        const allPeriods = periodsRes.rows;
        const allCommerces = commercesRes.rows;

        const [draftsRes, pricesRes] = await Promise.all([
            pool.query('SELECT product_id, commerce_id, period_id, price FROM draft_prices WHERE user_id = $1', [userId]),
            pool.query('SELECT product_id, commerce_id, period_id, price FROM prices WHERE user_id = $1', [userId])
        ]);

        const dashboardData = allPeriods.map(period => {
            const tasks = allCommerces.map(commerce => {
                const submittedPricesForPeriod = pricesRes.rows.filter(
                    p => p.period_id === period.id && p.commerce_id === commerce.id
                );
                const draftPricesForPeriod = draftsRes.rows.filter(
                    d => d.period_id === period.id && d.commerce_id === commerce.id
                );

                let status = 'Pendiente';
                if (submittedPricesForPeriod.length > 0) {
                    status = 'Completado';
                } else if (draftPricesForPeriod.length > 0) {
                    status = 'En Proceso';
                }

                return {
                    commerceId: commerce.id,
                    commerceName: commerce.name,
                    status,
                    draftPrices: draftPricesForPeriod.reduce((acc, p) => {
                        acc[p.product_id] = p.price;
                        return acc;
                    }, {}),
                    submittedPrices: submittedPricesForPeriod.reduce((acc, p) => {
                        acc[p.product_id] = p.price;
                        return acc;
                    }, {})
                };
            });

            return {
                periodId: period.id,
                periodName: period.name,
                status: period.status,
                tasks,
            };
        });

        return dashboardData;
    },

    async saveDraft(userId, commerceId, periodId, prices) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = $2 AND period_id = $3',
                [userId, commerceId, periodId]
            );

            if (prices && Object.keys(prices).length > 0) {
                const priceEntries = Object.entries(prices).filter(
                    ([_, price]) => price !== '' && price !== null
                );

                if (priceEntries.length > 0) {
                    const insertQuery = `
                        INSERT INTO draft_prices (user_id, product_id, commerce_id, period_id, price)
                        SELECT $1, unnest($2::int[]), $3, $4, unnest($5::numeric[])
                    `;
                    const productIds = priceEntries.map(([productId]) => parseInt(productId));
                    const priceValues = priceEntries.map(([_, price]) => price);
                    await client.query(insertQuery, [userId, productIds, commerceId, periodId, priceValues]);
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async submitPrices(userId, periodId, pricesData) {
        const client = await pool.connect();
        const commerceId = pricesData.length > 0 ? pricesData[0].commerceId : null;

        try {
            await client.query('BEGIN');

            for (const p of pricesData) {
                await client.query(
                    'INSERT INTO prices (price, period_id, product_id, user_id, commerce_id) VALUES ($1, $2, $3, $4, $5)',
                    [p.price, periodId, p.productId, userId, p.commerceId]
                );
            }

            if (commerceId) {
                await client.query(
                    'DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = $2 AND period_id = $3',
                    [userId, commerceId, periodId]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

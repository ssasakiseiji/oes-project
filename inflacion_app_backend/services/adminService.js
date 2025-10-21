import pool from '../config/database.js';

export const adminService = {
    // Periods management
    async getPeriods() {
        const result = await pool.query('SELECT * FROM periods ORDER BY year DESC, month DESC');
        return result.rows;
    },

    async createPeriod({ name, month, year, start_date, end_date }) {
        const existingPeriod = await pool.query(
            'SELECT id FROM periods WHERE month = $1 AND year = $2',
            [month, year]
        );

        if (existingPeriod.rows.length > 0) {
            const error = new Error(`Ya existe un período de recolección para ${name}.`);
            error.statusCode = 409;
            throw error;
        }

        const query = `
            INSERT INTO periods (name, month, year, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5, 'Scheduled')
            RETURNING *;
        `;
        const result = await pool.query(query, [name, month, year, start_date, end_date]);
        return result.rows[0];
    },

    async updatePeriod(id, { start_date, end_date }) {
        const result = await pool.query(
            'UPDATE periods SET start_date = $1, end_date = $2 WHERE id = $3 RETURNING *',
            [start_date, end_date, id]
        );

        if (result.rows.length === 0) {
            const error = new Error('Período no encontrado');
            error.statusCode = 404;
            throw error;
        }

        return result.rows[0];
    },

    async updatePeriodStatus(id, status) {
        if (status === 'Open') {
            const openPeriods = await pool.query(
                "SELECT id FROM periods WHERE status = 'Open' AND id != $1",
                [id]
            );

            if (openPeriods.rows.length > 0) {
                const error = new Error('Ya existe otro período abierto. Ciérrelo antes de abrir uno nuevo.');
                error.statusCode = 409;
                throw error;
            }
        }

        const result = await pool.query(
            'UPDATE periods SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0];
    },

    // Analysis
    async getAnalysis(periodAId, periodBId) {
        const getPrices = (periodId) => pool.query(
            'SELECT product_id, price FROM prices WHERE period_id = $1',
            [periodId]
        );

        const [pricesARes, pricesBRes, productsRes, categoriesRes] = await Promise.all([
            getPrices(periodAId),
            getPrices(periodBId),
            pool.query('SELECT id, name, category_id AS "categoryId" FROM products'),
            pool.query('SELECT id, name FROM categories')
        ]);

        const allProducts = productsRes.rows;
        const allCategories = categoriesRes.rows;

        const calculateAverages = (priceRows) => {
            const priceMap = new Map();
            priceRows.forEach(row => {
                if (!priceMap.has(row.product_id)) priceMap.set(row.product_id, []);
                const price = parseFloat(row.price);
                if (!isNaN(price)) {
                    priceMap.get(row.product_id).push(price);
                }
            });

            const avgMap = new Map();
            priceMap.forEach((prices, productId) => {
                if (prices.length > 0) {
                    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                    avgMap.set(productId, avg);
                }
            });
            return avgMap;
        };

        const avgPricesA = calculateAverages(pricesARes.rows);
        const avgPricesB = calculateAverages(pricesBRes.rows);

        let totalCostA = 0, totalCostB = 0;

        const calculateVariation = (costA, costB) => {
            if (costB > 0) {
                return ((costA - costB) / costB) * 100;
            }
            return costA > 0 ? 100 : 0;
        };

        const categoryAnalysis = allCategories.map(cat => {
            const categoryProducts = allProducts.filter(p => p.categoryId === cat.id);
            let catCostA = 0, catCostB = 0;

            const productAnalysis = categoryProducts.map(p => {
                const priceA = avgPricesA.get(p.id) || 0;
                const priceB = avgPricesB.get(p.id) || 0;
                catCostA += priceA;
                catCostB += priceB;
                return {
                    id: p.id,
                    name: p.name,
                    priceA,
                    priceB,
                    variation: calculateVariation(priceA, priceB)
                };
            });

            totalCostA += catCostA;
            totalCostB += catCostB;

            return {
                id: cat.id,
                name: cat.name,
                costA: catCostA,
                costB: catCostB,
                variation: calculateVariation(catCostA, catCostB),
                products: productAnalysis
            };
        });

        const totalVariation = calculateVariation(totalCostA, totalCostB);

        return {
            categoryAnalysis,
            totalCostA,
            totalCostB,
            totalVariation
        };
    },

    async getHistoricalData(productId, categoryId) {
        let query;
        let params = [];

        if (productId) {
            query = `
                SELECT p.name, AVG(pr.price) as "avgPrice"
                FROM prices pr
                JOIN periods p ON pr.period_id = p.id
                WHERE pr.product_id = $1
                GROUP BY p.id, p.name, p.year, p.month
                ORDER BY p.year, p.month;
            `;
            params = [productId];
        } else if (categoryId) {
            query = `
                SELECT p.name, AVG(pr.price) as "avgPrice"
                FROM prices pr
                JOIN products prod ON pr.product_id = prod.id
                JOIN periods p ON pr.period_id = p.id
                WHERE prod.category_id = $1
                GROUP BY p.id, p.name, p.year, p.month
                ORDER BY p.year, p.month;
            `;
            params = [categoryId];
        } else {
            const error = new Error('Se requiere productId o categoryId');
            error.statusCode = 400;
            throw error;
        }

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Prices management
    async getPrices(filters) {
        const { periodId, categoryId, productId, userId, commerceId, showOutliersOnly } = filters;

        let baseQuery = `
            WITH price_stats AS (
                SELECT period_id, product_id, AVG(price) as avg_price, STDDEV(price) as std_dev
                FROM prices
                GROUP BY period_id, product_id
            )
            SELECT
                pr.id, pr.price, pr.created_at AS "createdAt",
                pd.name AS "periodName", p.name AS "productName",
                u.name AS "userName", c.name AS "commerceName",
                CASE
                    WHEN ps.std_dev > 0 AND ABS(pr.price - ps.avg_price) > (2 * ps.std_dev)
                    THEN TRUE ELSE FALSE
                END AS "isOutlier"
            FROM prices pr
            JOIN periods pd ON pr.period_id = pd.id
            JOIN products p ON pr.product_id = p.id
            JOIN users u ON pr.user_id = u.id
            JOIN commerces c ON pr.commerce_id = c.id
            LEFT JOIN price_stats ps ON pr.period_id = ps.period_id AND pr.product_id = ps.product_id
        `;

        let whereClauses = [];
        let params = [];
        let paramIndex = 1;

        if (periodId) {
            whereClauses.push(`pr.period_id = $${paramIndex++}`);
            params.push(periodId);
        }
        if (categoryId) {
            whereClauses.push(`p.category_id = $${paramIndex++}`);
            params.push(categoryId);
        }
        if (productId) {
            whereClauses.push(`pr.product_id = $${paramIndex++}`);
            params.push(productId);
        }
        if (userId) {
            whereClauses.push(`pr.user_id = $${paramIndex++}`);
            params.push(userId);
        }
        if (commerceId) {
            whereClauses.push(`pr.commerce_id = $${paramIndex++}`);
            params.push(commerceId);
        }

        if (showOutliersOnly === 'true') {
            whereClauses.push(`(ps.std_dev > 0 AND ABS(pr.price - ps.avg_price) > (2 * ps.std_dev))`);
        }

        if (whereClauses.length > 0) {
            baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        baseQuery += ` ORDER BY pr.created_at DESC;`;

        const result = await pool.query(baseQuery, params);
        return result.rows;
    },

    async updatePrice(id, price) {
        const result = await pool.query(
            'UPDATE prices SET price = $1 WHERE id = $2 RETURNING *',
            [price, id]
        );
        return result.rows[0];
    },

    async deletePrice(id) {
        await pool.query('DELETE FROM prices WHERE id = $1', [id]);
    },

    // Users management
    async getUsers() {
        const result = await pool.query('SELECT id, name, email, roles FROM users ORDER BY name');
        return result.rows;
    },

    async createUser({ name, email, password, roles }) {
        // Check if email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            const error = new Error('Ya existe un usuario con ese email');
            error.statusCode = 409;
            throw error;
        }

        // Hash password
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, roles) VALUES ($1, $2, $3, $4) RETURNING id, name, email, roles',
            [name, email, passwordHash, roles]
        );
        return result.rows[0];
    },

    async updateUser(userId, { name, email, roles }) {
        // Check if email is taken by another user
        if (email) {
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );

            if (existingUser.rows.length > 0) {
                const error = new Error('Ya existe otro usuario con ese email');
                error.statusCode = 409;
                throw error;
            }
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
        }
        if (email) {
            updates.push(`email = $${paramIndex++}`);
            params.push(email);
        }
        if (roles) {
            updates.push(`roles = $${paramIndex++}`);
            params.push(roles);
        }

        if (updates.length === 0) {
            const error = new Error('No hay campos para actualizar');
            error.statusCode = 400;
            throw error;
        }

        params.push(userId);
        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, roles`,
            params
        );

        if (result.rows.length === 0) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        return result.rows[0];
    },

    async updateUserPassword(userId, newPassword) {
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
            [passwordHash, userId]
        );

        if (result.rows.length === 0) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        return { success: true };
    },

    async deleteUser(userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if user has submitted prices
            const pricesResult = await client.query(
                'SELECT COUNT(*) as count FROM prices WHERE user_id = $1',
                [userId]
            );
            const priceCount = parseInt(pricesResult.rows[0].count);

            if (priceCount > 0) {
                const error = new Error(`No se puede eliminar el usuario porque tiene ${priceCount} precio(s) registrado(s). Los datos históricos deben preservarse.`);
                error.statusCode = 409;
                throw error;
            }

            // Delete draft prices (estos sí se pueden eliminar)
            await client.query(
                'DELETE FROM draft_prices WHERE user_id = $1',
                [userId]
            );

            // Delete commerce assignments
            await client.query(
                'DELETE FROM commerce_assignments WHERE user_id = $1',
                [userId]
            );

            // Delete the user
            const result = await client.query(
                'DELETE FROM users WHERE id = $1 RETURNING id',
                [userId]
            );

            if (result.rows.length === 0) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                throw error;
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async updateUserRoles(userId, roles) {
        const result = await pool.query(
            'UPDATE users SET roles = $1 WHERE id = $2 RETURNING id, name, email, roles',
            [roles, userId]
        );
        return result.rows[0];
    }
};

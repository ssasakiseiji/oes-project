import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Carga las variables del archivo .env
dotenv.config();

// --- CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS ---
const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// --- MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authorizeAdmin = (req, res, next) => {
    if (!req.user.roles.includes('admin')) {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};

const checkCollectionPeriod = async (req, res, next) => {
    try {
        const query = `
            SELECT id, start_date, end_date FROM periods
            WHERE status = 'Open' AND NOW()::DATE BETWEEN start_date AND end_date;
        `;
        const result = await pool.query(query);
        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'La recolección de precios está cerrada en este momento.' });
        }
        req.activePeriodId = result.rows[0].id;
        next();
    } catch (error) {
        console.error("Error al verificar el período de recolección:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// --- RUTAS PÚBLICAS Y DE AUTENTICACIÓN ---
app.get('/', (req, res) => res.send('<h1>🚀 Backend de InflaciónApp está en línea y conectado a PostgreSQL!</h1>'));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            const userPayload = { id: user.id, name: user.name, roles: user.roles };
            const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
            res.status(200).json({ token: accessToken, user: userPayload });
        } else {
            res.status(401).json({ message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.get('/api/me', authenticateToken, (req, res) => {
    res.status(200).json(req.user);
});

// --- RUTAS PARA ESTUDIANTES Y MONITORES ---
app.get('/api/student-tasks', authenticateToken, async (req, res) => {
    try {
        const [productsRes, categoriesRes, commercesRes] = await Promise.all([
            pool.query('SELECT id, name, unit, category_id AS "categoryId" FROM products ORDER BY name'),
            pool.query('SELECT * FROM categories ORDER BY name'),
            pool.query('SELECT * FROM commerces ORDER BY name'),
        ]);
        res.status(200).json({
            products: productsRes.rows,
            categories: categoriesRes.rows,
            assignedCommerces: commercesRes.rows,
        });
    } catch (error) {
        console.error('Error al obtener datos estáticos de estudiante:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.get('/api/student/dashboard', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const [periodsRes, commercesRes] = await Promise.all([
            pool.query('SELECT id, name, status FROM periods ORDER BY year DESC, month DESC'),
            pool.query('SELECT id, name FROM commerces')
        ]);
        
        const allPeriods = periodsRes.rows;
        const allCommerces = commercesRes.rows;

        const [draftsRes, pricesRes] = await Promise.all([
            pool.query('SELECT product_id, commerce_id, period_id, price FROM draft_prices WHERE user_id = $1', [userId]),
            pool.query('SELECT product_id, commerce_id, period_id, price FROM prices WHERE user_id = $1', [userId])
        ]);

        const dashboardData = allPeriods.map(period => {
            const tasks = allCommerces.map(commerce => {
                const submittedPricesForPeriod = pricesRes.rows.filter(p => p.period_id === period.id && p.commerce_id === commerce.id);
                const draftPricesForPeriod = draftsRes.rows.filter(d => d.period_id === period.id && d.commerce_id === commerce.id);

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
                    draftPrices: draftPricesForPeriod.reduce((acc, p) => { acc[p.product_id] = p.price; return acc; }, {}),
                    submittedPrices: submittedPricesForPeriod.reduce((acc, p) => { acc[p.product_id] = p.price; return acc; }, {})
                };
            });

            return {
                periodId: period.id,
                periodName: period.name,
                status: period.status,
                tasks,
            };
        });

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Error al construir el dashboard del estudiante:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/api/save-draft', authenticateToken, checkCollectionPeriod, async (req, res) => {
    const { commerceId, prices } = req.body;
    const userId = req.user.id;
    const periodId = req.activePeriodId;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = $2 AND period_id = $3', [userId, commerceId, periodId]);

        if (prices && Object.keys(prices).length > 0) {
            const priceEntries = Object.entries(prices).filter(([_, price]) => price !== '' && price !== null);
            if (priceEntries.length > 0) {
                // Use parameterized queries to prevent SQL injection
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
        res.status(200).json({ message: 'Borrador guardado con éxito' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al guardar el borrador:', error);
        res.status(500).json({ message: "Error al guardar el borrador." });
    } finally {
        client.release();
    }
});


app.post('/api/submit-prices', authenticateToken, checkCollectionPeriod, async (req, res) => {
    const pricesData = req.body;
    const userId = req.user.id;
    const commerceId = pricesData.length > 0 ? pricesData[0].commerceId : null;
    const periodId = req.activePeriodId;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const p of pricesData) {
            await client.query(
                'INSERT INTO prices (price, period_id, product_id, user_id, commerce_id) VALUES ($1, $2, $3, $4, $5)',
                [p.price, periodId, p.productId, userId, p.commerceId]
            );
        }
        if (commerceId) {
            await client.query('DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = $2 AND period_id = $3', [userId, commerceId, periodId]);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: '¡Registro completado con éxito!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al guardar precios:', error);
        res.status(500).json({ message: "Error al guardar los precios." });
    } finally {
        client.release();
    }
});

// --- ¡ENDPOINT RECONSTRUIDO PARA EL MONITOR! ---
app.get('/api/monitor-data', authenticateToken, async (req, res) => {
    try {
        // 1. Obtenemos todas las entidades principales
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

        // 2. Obtenemos todos los datos de progreso (precios y borradores)
        const [pricesRes, draftsRes] = await Promise.all([
            pool.query('SELECT user_id, commerce_id, period_id, product_id, price FROM prices'),
            pool.query('SELECT user_id, commerce_id, period_id, product_id, price FROM draft_prices'),
        ]);

        // 3. Estructuramos la data por período
        const monitorDataByPeriod = allPeriods.map(period => {
            const studentProgress = allStudents.map(student => {
                const tasks = allCommerces.map(commerce => {
                    const submittedPrices = pricesRes.rows.filter(p => p.period_id === period.id && p.user_id === student.id && p.commerce_id === commerce.id);
                    const draftPrices = draftsRes.rows.filter(d => d.period_id === period.id && d.user_id === student.id && d.commerce_id === commerce.id);

                    let status = 'Pendiente';
                    if (submittedPrices.length >= totalProducts) {
                        status = 'Completado';
                    } else if (submittedPrices.length > 0 || draftPrices.length > 0) {
                        status = 'En Proceso';
                    }

                    const currentProgress = status === 'Completado' ? totalProducts : Math.max(submittedPrices.length, draftPrices.length);

                    return {
                        commerceId: commerce.id,
                        commerceName: commerce.name,
                        status,
                        progress: {
                            current: currentProgress,
                            total: totalProducts
                        },
                        draftPrices: draftPrices.reduce((acc, p) => { acc[p.product_id] = p.price; return acc; }, {}),
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

        res.status(200).json(monitorDataByPeriod);
    } catch (error) {
        console.error('Error al obtener datos de monitor:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});


// --- RUTAS DE ADMINISTRADOR ---
app.get('/api/periods', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM periods ORDER BY year DESC, month DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.post('/api/periods', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name, month, year, start_date, end_date } = req.body;
    try {
        const existingPeriod = await pool.query('SELECT id FROM periods WHERE month = $1 AND year = $2', [month, year]);
        if (existingPeriod.rows.length > 0) {
            return res.status(409).json({ message: `Ya existe un período de recolección para ${name}.` });
        }
        const query = `INSERT INTO periods (name, month, year, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, 'Scheduled') RETURNING *;`;
        const result = await pool.query(query, [name, month, year, start_date, end_date]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear período:', error);
        res.status(500).json({ message: "Error al crear el período." });
    }
});

app.put('/api/periods/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (status === 'Open') {
        const openPeriods = await pool.query("SELECT id FROM periods WHERE status = 'Open' AND id != $1", [id]);
        if (openPeriods.rows.length > 0) {
            return res.status(409).json({ message: "Ya existe otro período abierto. Ciérrelo antes de abrir uno nuevo." });
        }
    }
    try {
        const result = await pool.query('UPDATE periods SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el período." });
    }
});

app.post('/api/analysis', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { periodAId, periodBId } = req.body;
        const getPrices = (periodId) => pool.query('SELECT product_id, price FROM prices WHERE period_id = $1', [periodId]);
        
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
                return { id: p.id, name: p.name, priceA, priceB, variation: calculateVariation(priceA, priceB) };
            });
            totalCostA += catCostA;
            totalCostB += catCostB;
            return { id: cat.id, name: cat.name, costA: catCostA, costB: catCostB, variation: calculateVariation(catCostA, catCostB), products: productAnalysis };
        });

        const totalVariation = calculateVariation(totalCostA, totalCostB);
        res.status(200).json({ categoryAnalysis, totalCostA, totalCostB, totalVariation });
    } catch (error) {
        console.error('Error al generar análisis:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});


app.get('/api/historical-data', authenticateToken, authorizeAdmin, async (req, res) => {
    const { productId, categoryId } = req.query;
    try {
        let query;
        let params = [];
        if (productId) {
            query = `SELECT p.name, AVG(pr.price) as "avgPrice" FROM prices pr JOIN periods p ON pr.period_id = p.id WHERE pr.product_id = $1 GROUP BY p.id, p.name, p.year, p.month ORDER BY p.year, p.month;`;
            params = [productId];
        } else if (categoryId) {
            query = `SELECT p.name, AVG(pr.price) as "avgPrice" FROM prices pr JOIN products prod ON pr.product_id = prod.id JOIN periods p ON pr.period_id = p.id WHERE prod.category_id = $1 GROUP BY p.id, p.name, p.year, p.month ORDER BY p.year, p.month;`;
            params = [categoryId];
        } else {
            return res.status(400).json({ message: 'Se requiere productId o categoryId' });
        }
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.get('/api/prices', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { periodId, categoryId, productId, userId, commerceId, showOutliersOnly } = req.query;
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

        if (periodId) { whereClauses.push(`pr.period_id = $${paramIndex++}`); params.push(periodId); }
        if (categoryId) { whereClauses.push(`p.category_id = $${paramIndex++}`); params.push(categoryId); }
        if (productId) { whereClauses.push(`pr.product_id = $${paramIndex++}`); params.push(productId); }
        if (userId) { whereClauses.push(`pr.user_id = $${paramIndex++}`); params.push(userId); }
        if (commerceId) { whereClauses.push(`pr.commerce_id = $${paramIndex++}`); params.push(commerceId); }

        if (showOutliersOnly === 'true') {
            whereClauses.push(`(ps.std_dev > 0 AND ABS(pr.price - ps.avg_price) > (2 * ps.std_dev))`);
        }
        
        if (whereClauses.length > 0) {
            baseQuery += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        baseQuery += ` ORDER BY pr.created_at DESC;`;

        const result = await pool.query(baseQuery, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener registros de precios:', error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});


app.put('/api/prices/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { price } = req.body;
    try {
        const result = await pool.query('UPDATE prices SET price = $1 WHERE id = $2 RETURNING *', [price, id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar precio" });
    }
});

app.delete('/api/prices/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM prices WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar precio" });
    }
});

app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, roles FROM users ORDER BY name');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

app.post('/api/users/:userId/roles', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;
    const { roles } = req.body;
    try {
        const result = await pool.query('UPDATE users SET roles = $1 WHERE id = $2 RETURNING id, name, email, roles', [roles, userId]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar roles" });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
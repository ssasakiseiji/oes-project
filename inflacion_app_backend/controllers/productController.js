import pool from '../config/database.js';

export const productController = {
    async createProduct(req, res, next) {
        try {
            const { name, unit, categoryId } = req.body;

            if (!name || !unit || !categoryId) {
                return res.status(400).json({
                    message: 'Nombre, unidad y categoría son requeridos'
                });
            }

            const result = await pool.query(
                'INSERT INTO products (name, unit, category_id) VALUES ($1, $2, $3) RETURNING id, name, unit, category_id AS "categoryId"',
                [name, unit, categoryId]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            next(error);
        }
    },

    async updateProduct(req, res, next) {
        try {
            const { id } = req.params;
            const { name, unit } = req.body;

            if (!name || !unit) {
                return res.status(400).json({
                    message: 'Nombre y unidad son requeridos'
                });
            }

            const result = await pool.query(
                'UPDATE products SET name = $1, unit = $2 WHERE id = $3 RETURNING id, name, unit, category_id AS "categoryId"',
                [name, unit, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }

            res.status(200).json(result.rows[0]);
        } catch (error) {
            next(error);
        }
    },

    async deleteProduct(req, res, next) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                'DELETE FROM products WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
};

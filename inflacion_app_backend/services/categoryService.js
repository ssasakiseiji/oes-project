import pool from '../config/database.js';

export const categoryService = {
    async getAllCategories() {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        return result.rows;
    },

    async createCategory(name) {
        // Check if category already exists
        const existing = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
            [name]
        );

        if (existing.rows.length > 0) {
            const error = new Error('Ya existe una categoría con ese nombre');
            error.statusCode = 409;
            throw error;
        }

        const result = await pool.query(
            'INSERT INTO categories (name) VALUES ($1) RETURNING *',
            [name]
        );
        return result.rows[0];
    },

    async updateCategory(id, name) {
        // Check if another category has this name
        const existing = await pool.query(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
            [name, id]
        );

        if (existing.rows.length > 0) {
            const error = new Error('Ya existe otra categoría con ese nombre');
            error.statusCode = 409;
            throw error;
        }

        const result = await pool.query(
            'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );

        if (result.rows.length === 0) {
            const error = new Error('Categoría no encontrada');
            error.statusCode = 404;
            throw error;
        }

        return result.rows[0];
    },

    async deleteCategory(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if category has products
            const productsResult = await client.query(
                'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
                [id]
            );
            const productCount = parseInt(productsResult.rows[0].count);

            if (productCount > 0) {
                const error = new Error(`No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s)`);
                error.statusCode = 409;
                throw error;
            }

            const result = await client.query(
                'DELETE FROM categories WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                const error = new Error('Categoría no encontrada');
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
    }
};

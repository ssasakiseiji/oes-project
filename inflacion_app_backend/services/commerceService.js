import pool from '../config/database.js';

export const commerceService = {
    // Get all commerces with student assignment counts
    async getAllCommerces() {
        const query = `
            SELECT
                c.id,
                c.name,
                c.address,
                COUNT(ca.user_id) as assigned_students_count,
                ARRAY_AGG(
                    CASE WHEN u.id IS NOT NULL
                    THEN json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'email', u.email
                    )
                    ELSE NULL END
                ) FILTER (WHERE u.id IS NOT NULL) as assigned_students
            FROM commerces c
            LEFT JOIN commerce_assignments ca ON c.id = ca.commerce_id
            LEFT JOIN users u ON ca.user_id = u.id AND 'student' = ANY(u.roles)
            GROUP BY c.id, c.name, c.address
            ORDER BY c.name
        `;
        const result = await pool.query(query);
        return result.rows.map(row => ({
            ...row,
            assigned_students: row.assigned_students || []
        }));
    },

    // Get single commerce with details
    async getCommerceById(id) {
        const query = `
            SELECT
                c.id,
                c.name,
                c.address,
                ARRAY_AGG(
                    CASE WHEN u.id IS NOT NULL
                    THEN json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'email', u.email
                    )
                    ELSE NULL END
                ) FILTER (WHERE u.id IS NOT NULL) as assigned_students
            FROM commerces c
            LEFT JOIN commerce_assignments ca ON c.id = ca.commerce_id
            LEFT JOIN users u ON ca.user_id = u.id AND 'student' = ANY(u.roles)
            WHERE c.id = $1
            GROUP BY c.id, c.name, c.address
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('Comercio no encontrado');
        }

        return {
            ...result.rows[0],
            assigned_students: result.rows[0].assigned_students || []
        };
    },

    // Get students assigned to a commerce
    async getCommerceStudents(commerceId) {
        const query = `
            SELECT
                u.id,
                u.name,
                u.email,
                ca.assigned_at
            FROM users u
            INNER JOIN commerce_assignments ca ON u.id = ca.user_id
            WHERE ca.commerce_id = $1 AND 'student' = ANY(u.roles)
            ORDER BY u.name
        `;
        const result = await pool.query(query, [commerceId]);
        return result.rows;
    },

    // Create new commerce
    async createCommerce(data) {
        const { name, address } = data;

        const query = `
            INSERT INTO commerces (name, address)
            VALUES ($1, $2)
            RETURNING id, name, address
        `;
        const result = await pool.query(query, [name, address]);
        return result.rows[0];
    },

    // Update commerce
    async updateCommerce(id, data) {
        const { name, address } = data;

        const query = `
            UPDATE commerces
            SET name = $1, address = $2
            WHERE id = $3
            RETURNING id, name, address
        `;
        const result = await pool.query(query, [name, address, id]);

        if (result.rows.length === 0) {
            throw new Error('Comercio no encontrado');
        }

        return result.rows[0];
    },

    // Delete commerce
    async deleteCommerce(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // First, delete all assignments
            await client.query(
                'DELETE FROM commerce_assignments WHERE commerce_id = $1',
                [id]
            );

            // Then delete the commerce
            const result = await client.query(
                'DELETE FROM commerces WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                throw new Error('Comercio no encontrado');
            }

            await client.query('COMMIT');
            return { success: true, id: result.rows[0].id };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

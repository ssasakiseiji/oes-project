import pool from '../config/database.js';

export const commerceAssignmentService = {
    // Get all commerce assignments
    async getAllAssignments() {
        const query = `
            SELECT
                ca.id,
                ca.user_id,
                ca.commerce_id,
                ca.assigned_at,
                u.name as student_name,
                u.email as student_email,
                c.name as commerce_name,
                c.address as commerce_address,
                assigner.name as assigned_by_name
            FROM commerce_assignments ca
            JOIN users u ON ca.user_id = u.id
            JOIN commerces c ON ca.commerce_id = c.id
            LEFT JOIN users assigner ON ca.assigned_by = assigner.id
            ORDER BY u.name, c.name
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // Get assignments for a specific student
    async getStudentAssignments(userId) {
        const query = `
            SELECT
                ca.id,
                ca.commerce_id,
                c.name as commerce_name,
                c.address as commerce_address,
                ca.assigned_at
            FROM commerce_assignments ca
            JOIN commerces c ON ca.commerce_id = c.id
            WHERE ca.user_id = $1
            ORDER BY c.name
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // Get all students with their assigned commerces
    async getStudentsWithAssignments() {
        const studentsQuery = `
            SELECT id, name, email
            FROM users
            WHERE 'student' = ANY(roles)
            ORDER BY name
        `;
        const studentsResult = await pool.query(studentsQuery);
        const students = studentsResult.rows;

        // Get all commerces
        const commercesQuery = 'SELECT id, name, address FROM commerces ORDER BY name';
        const commercesResult = await pool.query(commercesQuery);
        const allCommerces = commercesResult.rows;

        // Get assignments for each student
        const assignmentsQuery = `
            SELECT user_id, commerce_id
            FROM commerce_assignments
        `;
        const assignmentsResult = await pool.query(assignmentsQuery);
        const assignments = assignmentsResult.rows;

        // Build response
        const studentsWithAssignments = students.map(student => {
            const studentAssignments = assignments
                .filter(a => a.user_id === student.id)
                .map(a => a.commerce_id);

            return {
                id: student.id,
                name: student.name,
                email: student.email,
                assignedCommerces: studentAssignments,
                assignedCommercesData: allCommerces.filter(c => studentAssignments.includes(c.id))
            };
        });

        return {
            students: studentsWithAssignments,
            allCommerces
        };
    },

    // Assign commerces to a student (replaces all existing assignments)
    async assignCommercesToStudent(userId, commerceIds, assignedBy) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get commerces that will be unassigned (existing - new)
            const existingAssignmentsRes = await client.query(
                'SELECT commerce_id FROM commerce_assignments WHERE user_id = $1',
                [userId]
            );
            const existingCommerceIds = existingAssignmentsRes.rows.map(row => row.commerce_id);
            const newCommerceIds = commerceIds || [];
            const unassignedCommerceIds = existingCommerceIds.filter(id => !newCommerceIds.includes(id));

            // Delete drafts for commerces that will be unassigned
            if (unassignedCommerceIds.length > 0) {
                await client.query(
                    'DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = ANY($2)',
                    [userId, unassignedCommerceIds]
                );
            }

            // Delete existing assignments
            await client.query(
                'DELETE FROM commerce_assignments WHERE user_id = $1',
                [userId]
            );

            // Insert new assignments
            if (commerceIds && commerceIds.length > 0) {
                const values = commerceIds.map((commerceId, index) =>
                    `($1, $${index + 2}, $${commerceIds.length + 2})`
                ).join(',');

                const insertQuery = `
                    INSERT INTO commerce_assignments (user_id, commerce_id, assigned_by)
                    VALUES ${values}
                `;
                await client.query(insertQuery, [userId, ...commerceIds, assignedBy]);
            }

            await client.query('COMMIT');

            // Return updated assignments
            return await this.getStudentAssignments(userId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Bulk assign: assign same commerces to multiple students
    async bulkAssignCommerces(userIds, commerceIds, assignedBy) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const userId of userIds) {
                // Delete existing assignments
                await client.query(
                    'DELETE FROM commerce_assignments WHERE user_id = $1',
                    [userId]
                );

                // Insert new assignments
                if (commerceIds && commerceIds.length > 0) {
                    for (const commerceId of commerceIds) {
                        await client.query(
                            'INSERT INTO commerce_assignments (user_id, commerce_id, assigned_by) VALUES ($1, $2, $3)',
                            [userId, commerceId, assignedBy]
                        );
                    }
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

    // Get commerce assignments summary
    async getAssignmentsSummary() {
        const query = `
            SELECT
                c.id as commerce_id,
                c.name as commerce_name,
                COUNT(ca.user_id) as assigned_students,
                ARRAY_AGG(u.name ORDER BY u.name) as student_names
            FROM commerces c
            LEFT JOIN commerce_assignments ca ON c.id = ca.commerce_id
            LEFT JOIN users u ON ca.user_id = u.id AND 'student' = ANY(u.roles)
            GROUP BY c.id, c.name
            ORDER BY c.name
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // Get commerces with their assigned students (for CommercesView)
    async getCommercesWithStudents() {
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

    // Assign commerce to multiple students (for modal)
    async assignCommerceToStudents(commerceId, studentIds, assignedBy) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check for existing assignments first
            const existingQuery = `
                SELECT user_id, u.name as student_name
                FROM commerce_assignments ca
                INNER JOIN users u ON ca.user_id = u.id
                WHERE ca.commerce_id = $1 AND ca.user_id = ANY($2)
            `;
            const existingResult = await client.query(existingQuery, [commerceId, studentIds]);

            if (existingResult.rows.length > 0) {
                const alreadyAssignedNames = existingResult.rows.map(r => r.student_name).join(', ');
                throw new Error(`Ya existe asignación para: ${alreadyAssignedNames}`);
            }

            // Insert new assignments
            if (studentIds && studentIds.length > 0) {
                for (const studentId of studentIds) {
                    await client.query(
                        `INSERT INTO commerce_assignments (user_id, commerce_id, assigned_by)
                         VALUES ($1, $2, $3)`,
                        [studentId, commerceId, assignedBy]
                    );
                }
            }

            await client.query('COMMIT');

            return {
                success: true,
                assigned: studentIds.length
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Remove assignment (unassign commerce from student)
    async removeAssignment(userId, commerceId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete drafts for this commerce from this student
            await client.query(
                'DELETE FROM draft_prices WHERE user_id = $1 AND commerce_id = $2',
                [userId, commerceId]
            );

            // Delete the assignment
            const result = await client.query(
                'DELETE FROM commerce_assignments WHERE user_id = $1 AND commerce_id = $2 RETURNING *',
                [userId, commerceId]
            );

            if (result.rows.length === 0) {
                throw new Error('Asignación no encontrada');
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

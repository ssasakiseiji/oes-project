import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authService = {
    async login(email, password) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            throw new Error('Credenciales incorrectas');
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            throw new Error('Credenciales incorrectas');
        }

        const userPayload = {
            id: user.id,
            name: user.name,
            roles: user.roles
        };

        const accessToken = jwt.sign(
            userPayload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return { token: accessToken, user: userPayload };
    },

    async getUserById(userId) {
        const result = await pool.query(
            'SELECT id, name, email, roles FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        return result.rows[0];
    }
};

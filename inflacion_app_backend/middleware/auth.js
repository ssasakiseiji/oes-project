import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticación requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
};

export const authorizeAdmin = (req, res, next) => {
    if (!req.user.roles.includes('admin')) {
        return res.status(403).json({
            message: 'Acceso denegado. Se requiere rol de administrador.'
        });
    }
    next();
};

export const authorizeMonitor = (req, res, next) => {
    if (!req.user.roles.includes('monitor') && !req.user.roles.includes('admin')) {
        return res.status(403).json({
            message: 'Acceso denegado. Se requiere rol de monitor o administrador.'
        });
    }
    next();
};

export const checkCollectionPeriod = async (req, res, next) => {
    try {
        const query = `
            SELECT id, start_date, end_date FROM periods
            WHERE status = 'Open' AND NOW()::DATE BETWEEN start_date AND end_date;
        `;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(403).json({
                message: 'La recolección de precios está cerrada en este momento.'
            });
        }

        req.activePeriodId = result.rows[0].id;
        next();
    } catch (error) {
        console.error("Error al verificar el período de recolección:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

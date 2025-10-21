import { authService } from '../services/authService.js';

export const authController = {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email y contraseña son requeridos'
                });
            }

            const result = await authService.login(email, password);
            res.status(200).json(result);
        } catch (error) {
            if (error.message === 'Credenciales incorrectas') {
                return res.status(401).json({ message: error.message });
            }
            next(error);
        }
    },

    async getMe(req, res, next) {
        try {
            res.status(200).json(req.user);
        } catch (error) {
            next(error);
        }
    }
};

import { adminService } from '../services/adminService.js';

export const adminController = {
    // Periods
    async getPeriods(req, res, next) {
        try {
            const result = await adminService.getPeriods();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async createPeriod(req, res, next) {
        try {
            const { name, month, year, start_date, end_date } = req.body;

            if (!name || !month || !year || !start_date || !end_date) {
                return res.status(400).json({
                    message: 'Todos los campos son requeridos: name, month, year, start_date, end_date'
                });
            }

            const result = await adminService.createPeriod({ name, month, year, start_date, end_date });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    async updatePeriod(req, res, next) {
        try {
            const { id } = req.params;
            const { start_date, end_date } = req.body;

            if (!start_date || !end_date) {
                return res.status(400).json({
                    message: 'Los campos start_date y end_date son requeridos'
                });
            }

            const result = await adminService.updatePeriod(id, { start_date, end_date });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async updatePeriodStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    message: 'El campo status es requerido'
                });
            }

            const result = await adminService.updatePeriodStatus(id, status);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Analysis
    async getAnalysis(req, res, next) {
        try {
            const { periodAId, periodBId } = req.body;

            if (!periodAId || !periodBId) {
                return res.status(400).json({
                    message: 'Se requieren ambos períodos para comparar: periodAId y periodBId'
                });
            }

            const result = await adminService.getAnalysis(periodAId, periodBId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async getHistoricalData(req, res, next) {
        try {
            const { productId, categoryId } = req.query;
            const result = await adminService.getHistoricalData(productId, categoryId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Prices
    async getPrices(req, res, next) {
        try {
            const result = await adminService.getPrices(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async updatePrice(req, res, next) {
        try {
            const { id } = req.params;
            const { price } = req.body;

            if (!price) {
                return res.status(400).json({
                    message: 'El campo price es requerido'
                });
            }

            const result = await adminService.updatePrice(id, price);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async deletePrice(req, res, next) {
        try {
            const { id } = req.params;
            await adminService.deletePrice(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },

    // Users
    async getUsers(req, res, next) {
        try {
            const result = await adminService.getUsers();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async createUser(req, res, next) {
        try {
            const { name, email, password, roles } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    message: 'Los campos name, email y password son requeridos'
                });
            }

            if (!roles || !Array.isArray(roles) || roles.length === 0) {
                return res.status(400).json({
                    message: 'Debe asignar al menos un rol al usuario'
                });
            }

            const result = await adminService.createUser({ name, email, password, roles });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    },

    async updateUser(req, res, next) {
        try {
            const { userId } = req.params;
            const { name, email, roles } = req.body;

            const result = await adminService.updateUser(userId, { name, email, roles });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async updateUserPassword(req, res, next) {
        try {
            const { userId } = req.params;
            const { password } = req.body;

            if (!password || password.length < 6) {
                return res.status(400).json({
                    message: 'La contraseña debe tener al menos 6 caracteres'
                });
            }

            const result = await adminService.updateUserPassword(userId, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async deleteUser(req, res, next) {
        try {
            const { userId } = req.params;
            await adminService.deleteUser(userId);
            res.status(200).json({ message: 'Usuario eliminado exitosamente' });
        } catch (error) {
            next(error);
        }
    },

    async updateUserRoles(req, res, next) {
        try {
            const { userId } = req.params;
            const { roles } = req.body;

            if (!roles || !Array.isArray(roles)) {
                return res.status(400).json({
                    message: 'El campo roles es requerido y debe ser un array'
                });
            }

            const result = await adminService.updateUserRoles(userId, roles);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
};

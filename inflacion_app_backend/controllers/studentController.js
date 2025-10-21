import { studentService } from '../services/studentService.js';

export const studentController = {
    async getStudentTasks(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await studentService.getStudentTasks(userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async getStudentDashboard(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await studentService.getStudentDashboard(userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async saveDraft(req, res, next) {
        try {
            const { commerceId, prices } = req.body;
            const userId = req.user.id;
            const periodId = req.activePeriodId;

            await studentService.saveDraft(userId, commerceId, periodId, prices);
            res.status(200).json({ message: 'Borrador guardado con éxito' });
        } catch (error) {
            next(error);
        }
    },

    async submitPrices(req, res, next) {
        try {
            const pricesData = req.body;
            const userId = req.user.id;
            const periodId = req.activePeriodId;

            if (!Array.isArray(pricesData) || pricesData.length === 0) {
                return res.status(400).json({
                    message: 'Debe proporcionar al menos un precio'
                });
            }

            await studentService.submitPrices(userId, periodId, pricesData);
            res.status(201).json({ message: '¡Registro completado con éxito!' });
        } catch (error) {
            next(error);
        }
    }
};

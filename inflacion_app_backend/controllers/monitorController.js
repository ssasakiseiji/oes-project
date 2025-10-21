import { monitorService } from '../services/monitorService.js';

export const monitorController = {
    async getMonitorData(req, res, next) {
        try {
            const result = await monitorService.getMonitorData();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
};

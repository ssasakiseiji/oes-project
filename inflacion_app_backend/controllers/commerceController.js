import { commerceService } from '../services/commerceService.js';

export const commerceController = {
    // Get all commerces with assignment info
    async getAllCommerces(req, res, next) {
        try {
            const commerces = await commerceService.getAllCommerces();
            res.status(200).json(commerces);
        } catch (error) {
            next(error);
        }
    },

    // Get single commerce by ID
    async getCommerceById(req, res, next) {
        try {
            const { id } = req.params;
            const commerce = await commerceService.getCommerceById(id);
            res.status(200).json(commerce);
        } catch (error) {
            next(error);
        }
    },

    // Get students assigned to a commerce
    async getCommerceStudents(req, res, next) {
        try {
            const { id } = req.params;
            const students = await commerceService.getCommerceStudents(id);
            res.status(200).json(students);
        } catch (error) {
            next(error);
        }
    },

    // Create new commerce
    async createCommerce(req, res, next) {
        try {
            const { name, address } = req.body;

            if (!name || !address) {
                return res.status(400).json({
                    message: 'Los campos name y address son requeridos'
                });
            }

            const commerce = await commerceService.createCommerce({ name: name.trim(), address: address.trim() });
            res.status(201).json(commerce);
        } catch (error) {
            next(error);
        }
    },

    // Update commerce
    async updateCommerce(req, res, next) {
        try {
            const { id } = req.params;
            const { name, address } = req.body;

            if (!name || !address) {
                return res.status(400).json({
                    message: 'Los campos name y address son requeridos'
                });
            }

            const commerce = await commerceService.updateCommerce(id, {
                name: name.trim(),
                address: address.trim()
            });
            res.status(200).json(commerce);
        } catch (error) {
            next(error);
        }
    },

    // Delete commerce
    async deleteCommerce(req, res, next) {
        try {
            const { id } = req.params;
            const result = await commerceService.deleteCommerce(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
};

import { categoryService } from '../services/categoryService.js';

export const categoryController = {
    async getAllCategories(req, res, next) {
        try {
            const categories = await categoryService.getAllCategories();
            res.status(200).json(categories);
        } catch (error) {
            next(error);
        }
    },

    async createCategory(req, res, next) {
        try {
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    message: 'El nombre de la categoría es requerido'
                });
            }

            const category = await categoryService.createCategory(name.trim());
            res.status(201).json(category);
        } catch (error) {
            next(error);
        }
    },

    async updateCategory(req, res, next) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    message: 'El nombre de la categoría es requerido'
                });
            }

            const category = await categoryService.updateCategory(id, name.trim());
            res.status(200).json(category);
        } catch (error) {
            next(error);
        }
    },

    async deleteCategory(req, res, next) {
        try {
            const { id } = req.params;
            await categoryService.deleteCategory(id);
            res.status(200).json({ message: 'Categoría eliminada exitosamente' });
        } catch (error) {
            next(error);
        }
    }
};

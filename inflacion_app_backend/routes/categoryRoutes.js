import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes (authenticated users can read)
router.get('/categories', authenticateToken, categoryController.getAllCategories);

// Admin-only routes
router.post('/categories', authenticateToken, authorizeAdmin, categoryController.createCategory);
router.put('/categories/:id', authenticateToken, authorizeAdmin, categoryController.updateCategory);
router.delete('/categories/:id', authenticateToken, authorizeAdmin, categoryController.deleteCategory);

export default router;

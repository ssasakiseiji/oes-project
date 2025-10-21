import express from 'express';
import { commerceController } from '../controllers/commerceController.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Public routes (any authenticated user can view commerces)
router.get('/', commerceController.getAllCommerces);
router.get('/:id', commerceController.getCommerceById);
router.get('/:id/students', commerceController.getCommerceStudents);

// Admin-only routes
router.post('/', authorizeAdmin, commerceController.createCommerce);
router.put('/:id', authorizeAdmin, commerceController.updateCommerce);
router.delete('/:id', authorizeAdmin, commerceController.deleteCommerce);

export default router;

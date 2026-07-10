import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/authValidators.js';

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get('/me', authenticateToken, authController.getMe);

export default router;

import express from 'express';
import { studentController } from '../controllers/studentController.js';
import { authenticateToken, checkCollectionPeriod } from '../middleware/auth.js';

const router = express.Router();

router.get('/student-tasks', authenticateToken, studentController.getStudentTasks);
router.get('/student/dashboard', authenticateToken, studentController.getStudentDashboard);
router.post('/save-draft', authenticateToken, checkCollectionPeriod, studentController.saveDraft);
router.post('/submit-prices', authenticateToken, checkCollectionPeriod, studentController.submitPrices);

export default router;

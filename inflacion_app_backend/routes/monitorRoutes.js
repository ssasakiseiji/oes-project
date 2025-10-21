import express from 'express';
import { monitorController } from '../controllers/monitorController.js';
import { authenticateToken, authorizeMonitor } from '../middleware/auth.js';

const router = express.Router();

router.get('/monitor-data', authenticateToken, authorizeMonitor, monitorController.getMonitorData);

export default router;

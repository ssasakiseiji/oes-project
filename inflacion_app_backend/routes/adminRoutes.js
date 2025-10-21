import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(authenticateToken);
router.use(authorizeAdmin);

// Periods
router.get('/periods', adminController.getPeriods);
router.post('/periods', adminController.createPeriod);
router.put('/periods/:id', adminController.updatePeriod);
router.put('/periods/:id/status', adminController.updatePeriodStatus);

// Analysis
router.post('/analysis', adminController.getAnalysis);
router.get('/historical-data', adminController.getHistoricalData);

// Prices
router.get('/prices', adminController.getPrices);
router.put('/prices/:id', adminController.updatePrice);
router.delete('/prices/:id', adminController.deletePrice);

// Users
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.put('/users/:userId/password', adminController.updateUserPassword);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/roles', adminController.updateUserRoles);

export default router;

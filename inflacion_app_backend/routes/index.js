import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import monitorRoutes from './monitorRoutes.js';
import adminRoutes from './adminRoutes.js';
import commerceRoutes from './commerceRoutes.js';
import commerceAssignmentRoutes from './commerceAssignmentRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';

const router = express.Router();

// Mount route modules
router.use('/api', authRoutes);
router.use('/api', studentRoutes);
router.use('/api', monitorRoutes);
router.use('/api', adminRoutes);
router.use('/api/commerces', commerceRoutes);
router.use('/api', commerceAssignmentRoutes);
router.use('/api', categoryRoutes);
router.use('/api', productRoutes);

export default router;

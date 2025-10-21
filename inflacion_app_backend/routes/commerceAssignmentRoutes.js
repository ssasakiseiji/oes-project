import express from 'express';
import { commerceAssignmentController } from '../controllers/commerceAssignmentController.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin authorization
router.use(authenticateToken);
router.use(authorizeAdmin);

// Get all students with their assignments
router.get('/commerce-assignments/students', commerceAssignmentController.getStudentsWithAssignments);

// Get assignments for a specific student
router.get('/commerce-assignments/student/:studentId', commerceAssignmentController.getStudentAssignments);

// Assign commerces to a student
router.post('/commerce-assignments/student/:studentId', commerceAssignmentController.assignCommercesToStudent);

// Bulk assign commerces to multiple students
router.post('/commerce-assignments/bulk', commerceAssignmentController.bulkAssignCommerces);

// Get assignments summary
router.get('/commerce-assignments/summary', commerceAssignmentController.getAssignmentsSummary);

// Assign commerce to multiple students (with validation)
router.post('/commerce-assignments/assign', commerceAssignmentController.assignCommerceToStudents);

// Remove specific assignment
router.delete('/commerce-assignments/student/:studentId/commerce/:commerceId', commerceAssignmentController.removeAssignment);

export default router;

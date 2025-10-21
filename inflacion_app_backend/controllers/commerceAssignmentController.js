import { commerceAssignmentService } from '../services/commerceAssignmentService.js';

export const commerceAssignmentController = {
    // Get all students with their assignments
    async getStudentsWithAssignments(req, res, next) {
        try {
            const result = await commerceAssignmentService.getStudentsWithAssignments();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // Get assignments for a specific student
    async getStudentAssignments(req, res, next) {
        try {
            const { studentId } = req.params;
            const assignments = await commerceAssignmentService.getStudentAssignments(studentId);
            res.status(200).json(assignments);
        } catch (error) {
            next(error);
        }
    },

    // Assign commerces to a student
    async assignCommercesToStudent(req, res, next) {
        try {
            const { studentId } = req.params;
            const { commerceIds } = req.body;
            const assignedBy = req.user.id;

            if (!Array.isArray(commerceIds)) {
                return res.status(400).json({
                    message: 'commerceIds debe ser un array'
                });
            }

            const result = await commerceAssignmentService.assignCommercesToStudent(
                studentId,
                commerceIds,
                assignedBy
            );

            res.status(200).json({
                message: 'Comercios asignados exitosamente',
                assignments: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Bulk assign commerces to multiple students
    async bulkAssignCommerces(req, res, next) {
        try {
            const { studentIds, commerceIds } = req.body;
            const assignedBy = req.user.id;

            if (!Array.isArray(studentIds) || !Array.isArray(commerceIds)) {
                return res.status(400).json({
                    message: 'studentIds y commerceIds deben ser arrays'
                });
            }

            await commerceAssignmentService.bulkAssignCommerces(
                studentIds,
                commerceIds,
                assignedBy
            );

            res.status(200).json({
                message: `Comercios asignados a ${studentIds.length} estudiante(s) exitosamente`
            });
        } catch (error) {
            next(error);
        }
    },

    // Get assignments summary
    async getAssignmentsSummary(req, res, next) {
        try {
            const summary = await commerceAssignmentService.getAssignmentsSummary();
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    },

    // Assign commerce to multiple students (with validation)
    async assignCommerceToStudents(req, res, next) {
        try {
            const { commerceId, studentIds } = req.body;
            const assignedBy = req.user.id;

            if (!commerceId) {
                return res.status(400).json({
                    message: 'commerceId es requerido'
                });
            }

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({
                    message: 'studentIds debe ser un array no vacío'
                });
            }

            const result = await commerceAssignmentService.assignCommerceToStudents(
                commerceId,
                studentIds,
                assignedBy
            );

            res.status(200).json({
                message: `Comercio asignado a ${result.assigned} estudiante(s) exitosamente`,
                ...result
            });
        } catch (error) {
            // Check if it's a validation error
            if (error.message && error.message.includes('Ya existe asignación')) {
                return res.status(409).json({
                    message: error.message,
                    type: 'duplicate_assignment'
                });
            }
            next(error);
        }
    },

    // Remove assignment
    async removeAssignment(req, res, next) {
        try {
            const { studentId, commerceId } = req.params;

            await commerceAssignmentService.removeAssignment(studentId, commerceId);

            res.status(200).json({
                message: 'Asignación eliminada exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }
};

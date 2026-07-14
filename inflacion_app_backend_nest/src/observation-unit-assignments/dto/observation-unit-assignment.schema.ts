import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/controllers/commerceAssignmentController.js
export const assignCommercesToStudentSchema = z.object({
  commerceIds: z.array(z.number(), { error: 'commerceIds debe ser un array' }),
});

export const bulkAssignCommercesSchema = z.object({
  studentIds: z.array(z.number(), {
    error: 'studentIds y commerceIds deben ser arrays',
  }),
  commerceIds: z.array(z.number(), {
    error: 'studentIds y commerceIds deben ser arrays',
  }),
});

export const assignCommerceToStudentsSchema = z.object({
  commerceId: z.number({ error: 'commerceId es requerido' }),
  studentIds: z
    .array(z.number())
    .min(1, 'studentIds debe ser un array no vacío'),
});

export type AssignCommercesToStudentDto = z.infer<
  typeof assignCommercesToStudentSchema
>;
export type BulkAssignCommercesDto = z.infer<typeof bulkAssignCommercesSchema>;
export type AssignCommerceToStudentsDto = z.infer<
  typeof assignCommerceToStudentsSchema
>;

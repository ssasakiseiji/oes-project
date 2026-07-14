import { z } from 'zod';

export const assignObservationUnitsToStudentSchema = z.object({
  observationUnitIds: z.array(z.number(), {
    error: 'observationUnitIds debe ser un array',
  }),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export const bulkAssignObservationUnitsSchema = z.object({
  studentIds: z.array(z.number(), {
    error: 'studentIds y observationUnitIds deben ser arrays',
  }),
  observationUnitIds: z.array(z.number(), {
    error: 'studentIds y observationUnitIds deben ser arrays',
  }),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export const assignObservationUnitToStudentsSchema = z.object({
  observationUnitId: z.number({ error: 'observationUnitId es requerido' }),
  studentIds: z
    .array(z.number())
    .min(1, 'studentIds debe ser un array no vacío'),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export type AssignObservationUnitsToStudentDto = z.infer<
  typeof assignObservationUnitsToStudentSchema
>;
export type BulkAssignObservationUnitsDto = z.infer<
  typeof bulkAssignObservationUnitsSchema
>;
export type AssignObservationUnitToStudentsDto = z.infer<
  typeof assignObservationUnitToStudentsSchema
>;

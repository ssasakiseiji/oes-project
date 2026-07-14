import { z } from 'zod';

export const createStudyFieldSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del campo de estudio es requerido'),
});

export type CreateStudyFieldDto = z.infer<typeof createStudyFieldSchema>;

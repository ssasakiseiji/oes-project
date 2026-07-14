import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del proyecto es requerido'),
  description: z.string().trim().optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.isArchived !== undefined,
    { message: 'No hay campos para actualizar' },
  );

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la categoría es requerido'),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

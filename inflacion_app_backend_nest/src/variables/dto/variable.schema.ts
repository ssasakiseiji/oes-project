import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/controllers/productController.js
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre, unidad y categoría son requeridos'),
  unit: z.string().min(1, 'Nombre, unidad y categoría son requeridos'),
  categoryId: z.number({ error: 'Nombre, unidad y categoría son requeridos' }),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Nombre y unidad son requeridos'),
  unit: z.string().min(1, 'Nombre y unidad son requeridos'),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

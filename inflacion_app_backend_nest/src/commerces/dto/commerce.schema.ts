import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/controllers/commerceController.js
export const commerceSchema = z.object({
  name: z.string().trim().min(1, 'Los campos name y address son requeridos'),
  address: z.string().trim().min(1, 'Los campos name y address son requeridos'),
});

export type CommerceDto = z.infer<typeof commerceSchema>;

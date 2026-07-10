import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/validators/authValidators.js
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginDto = z.infer<typeof loginSchema>;

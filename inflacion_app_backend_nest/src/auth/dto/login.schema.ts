import { z } from 'zod';
import { emailSchema } from '../../common/validation/email';

// Port 1:1 de inflacion_app_backend/validators/authValidators.js, salvo la
// normalización del email (ver common/validation/email.ts).
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type LoginDto = z.infer<typeof loginSchema>;

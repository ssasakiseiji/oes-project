import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/validators/adminValidators.js, mas los
// esquemas que en adminController.js eran chequeos manuales (`if (!x) return
// res.status(400)...`) y acá se formalizan como zod, siguiendo el mismo
// patrón que commerce-assignment.schema.ts.

export const createPeriodSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  month: z.coerce.number(),
  year: z.coerce.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

export const updatePeriodSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

export const updatePeriodStatusSchema = z.object({
  status: z.string().min(1, 'El campo status es requerido'),
});

export const getAnalysisSchema = z.object({
  periodAId: z.number({
    error: 'Se requieren ambos períodos para comparar: periodAId y periodBId',
  }),
  periodBId: z.number({
    error: 'Se requieren ambos períodos para comparar: periodAId y periodBId',
  }),
});

// `value` no se coerciona a propósito -- z.coerce.number() convertiría un
// booleano `true` a `1` antes de llegar a la validación real por dataType
// (toObservationValueFields), que es la que sabe si esta observación es
// numérica, categórica, booleana o de texto.
export const updateObservationSchema = z.object({
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  roles: z.array(z.string()).min(1, 'Debe asignar al menos un rol al usuario'),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email('Email inválido').optional(),
    roles: z.array(z.string()).optional(),
  })
  .refine((data) => data.name || data.email || data.roles, {
    message: 'No hay campos para actualizar',
  });

export const updateUserPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const updateUserRolesSchema = z.object({
  roles: z.array(z.string(), {
    error: 'El campo roles es requerido y debe ser un array',
  }),
});

export type CreatePeriodDto = z.infer<typeof createPeriodSchema>;
export type UpdatePeriodDto = z.infer<typeof updatePeriodSchema>;
export type UpdatePeriodStatusDto = z.infer<typeof updatePeriodStatusSchema>;
export type GetAnalysisDto = z.infer<typeof getAnalysisSchema>;
export type UpdateObservationDto = z.infer<typeof updateObservationSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserPasswordDto = z.infer<typeof updateUserPasswordSchema>;
export type UpdateUserRolesDto = z.infer<typeof updateUserRolesSchema>;

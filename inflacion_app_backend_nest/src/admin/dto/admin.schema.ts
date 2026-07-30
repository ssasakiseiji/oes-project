import { z } from 'zod';

// Port 1:1 de inflacion_app_backend/validators/adminValidators.js, mas los
// esquemas que en adminController.js eran chequeos manuales (`if (!x) return
// res.status(400)...`) y acá se formalizan como zod, siguiendo el mismo
// patrón que commerce-assignment.schema.ts.
//
// Fase Q: todos los schemas que respaldan un recurso project-scoped ganan
// `projectId` (usado por ProjectRolesGuard y, en los casos donde hace
// falta, por un chequeo IDOR en el service antes de tocar el registro).

export const createPeriodSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  month: z.coerce.number(),
  year: z.coerce.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export const updatePeriodSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export const updatePeriodStatusSchema = z.object({
  status: z.string().min(1, 'El campo status es requerido'),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export const getAnalysisSchema = z.object({
  periodAId: z.number({
    error: 'Se requieren ambos períodos para comparar: periodAId y periodBId',
  }),
  periodBId: z.number({
    error: 'Se requieren ambos períodos para comparar: periodAId y periodBId',
  }),
  projectId: z.number({ error: 'projectId es requerido' }),
});

// `value` no se coerciona a propósito -- z.coerce.number() convertiría un
// booleano `true` a `1` antes de llegar a la validación real por dataType
// (toObservationValueFields), que es la que sabe si esta observación es
// numérica, categórica, booleana o de texto.
export const updateObservationSchema = z.object({
  value: z.union([z.number(), z.string(), z.boolean()]),
  projectId: z.number({ error: 'projectId es requerido' }),
});

// Fase R: un admin de proyecto puede crear un User nuevo y adjuntarlo a su
// proyecto en el mismo paso (decisión confirmada) -- roles acá son roles DE
// PROYECTO (ProjectMembership.roles), no el `roles` global de User (que
// ahora solo existe para 'superadmin').
export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  projectId: z.number({ error: 'projectId es requerido' }),
  roles: z.array(z.string()).min(1, 'Debe asignar al menos un rol al usuario'),
});

// roles sale de acá -- ya no es un campo global editable, ver
// updateUserRolesSchema (superadmin-only) y ProjectMembershipsController
// (rol dentro de un proyecto). projectId es requerido para que el service
// pueda verificar que este admin tiene autoridad sobre el usuario objetivo
// (debe ser miembro de ese mismo proyecto).
export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email('Email inválido').optional(),
    projectId: z.number({ error: 'projectId es requerido' }),
  })
  .refine((data) => data.name || data.email, {
    message: 'No hay campos para actualizar',
  });

export const updateUserPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  projectId: z.number({ error: 'projectId es requerido' }),
});

// Fase R: repropuesto -- ya no otorga roles arbitrarios (admin/monitor/
// student, que ahora son por proyecto vía ProjectMembership), solo puede
// otorgar o revocar 'superadmin'. Ruta superadmin-only.
export const updateUserRolesSchema = z.object({
  roles: z
    .array(z.string(), {
      error: 'El campo roles es requerido y debe ser un array',
    })
    .refine((roles) => roles.every((role) => role === 'superadmin'), {
      message: "Este endpoint solo puede otorgar o revocar el rol 'superadmin'",
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

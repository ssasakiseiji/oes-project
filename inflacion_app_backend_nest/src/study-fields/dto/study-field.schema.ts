import { z } from 'zod';

// unitOfMeasure (Fase Z): opcional y nullable a propósito. Un campo de estudio
// puramente cualitativo no tiene unidad que declarar, y `null` es la forma de
// borrarla explícitamente en un update (ausente = "no la toques"). El `''` ->
// null normaliza el input del form, que manda string vacío cuando el admin
// limpia el campo.
const unitOfMeasureSchema = z
  .string()
  .trim()
  .max(50, 'La unidad de medida no puede superar los 50 caracteres')
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

export const createStudyFieldSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del campo de estudio es requerido'),
  unitOfMeasure: unitOfMeasureSchema,
  projectId: z.number({ error: 'projectId es requerido' }),
});

export type CreateStudyFieldDto = z.infer<typeof createStudyFieldSchema>;

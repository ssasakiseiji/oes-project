import { z } from 'zod';

export const observationUnitSchema = z.object({
  name: z.string().trim().min(1, 'Los campos name y address son requeridos'),
  address: z.string().trim().min(1, 'Los campos name y address son requeridos'),
  projectId: z.number({ error: 'projectId es requerido' }),
});

export type ObservationUnitDto = z.infer<typeof observationUnitSchema>;

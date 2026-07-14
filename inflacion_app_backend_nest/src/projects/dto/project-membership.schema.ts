import { z } from 'zod';

export const upsertProjectMembershipSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  roles: z.array(z.string()).min(1, 'Debe asignar al menos un rol'),
});

export type UpsertProjectMembershipDto = z.infer<
  typeof upsertProjectMembershipSchema
>;

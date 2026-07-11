import { z } from 'zod';

// Port de la validación manual en
// inflacion_app_backend/controllers/studentController.js#submitPrices.
const priceEntrySchema = z.object({
  productId: z.number().int().positive(),
  commerceId: z.number().int().positive(),
  price: z.number().positive().max(99999999),
});

export const submitPricesSchema = z
  .array(priceEntrySchema)
  .min(1, 'Debe proporcionar al menos un precio')
  .refine((entries) => new Set(entries.map((p) => p.commerceId)).size <= 1, {
    message: 'Todos los precios deben ser para el mismo comercio',
  });

export const saveDraftSchema = z.object({
  commerceId: z.number().int().positive(),
  prices: z
    .record(z.string(), z.union([z.number(), z.string(), z.null()]))
    .optional(),
});

export type SubmitPricesDto = z.infer<typeof submitPricesSchema>;
export type SaveDraftDto = z.infer<typeof saveDraftSchema>;

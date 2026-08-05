import { z } from 'zod';

// Fase H/I: unifica lo que antes eran dos formas distintas para el mismo
// dato -- saveDraftSchema recibía un mapa {productId: price} y
// submitPricesSchema un array de {productId, commerceId, price} (con un
// .refine para exigir que todas las entradas compartieran el mismo
// commerceId). Ambas pasan a compartir el mismo envelope
// {observationUnitId, values: [{variableId, value}]}, con
// observationUnitId una sola vez a nivel del envelope -- el .refine de
// "mismo comercio" se vuelve estructuralmente imposible de violar.
//
// `value` se valida acá solo en su FORMA (number | string | boolean); la
// validación real contra el dataType de cada Variable ocurre en
// students.service.ts vía common/validation/variable-value.ts, porque acá
// no se sabe a qué Variable corresponde cada entrada hasta resolverla en
// la base.
// Fase AD: `isUnavailable` marca "fui, miré y no había" -- una respuesta sin
// valor. Es la única entrada que puede llegar con `value` en null y aun así
// tener que persistirse; el resto se descarta como vacía (ver saveDraft).
const valueEntrySchema = z.object({
  variableId: z.number().int().positive(),
  value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  isUnavailable: z.boolean().optional(),
});

export const saveDraftSchema = z.object({
  observationUnitId: z.number().int().positive(),
  values: z.array(valueEntrySchema).optional(),
});

export const submitObservationsSchema = z.object({
  observationUnitId: z.number().int().positive(),
  values: z
    .array(
      // En el envío el valor sí es obligatorio, SALVO que la entrada venga
      // marcada como no disponible -- ahí la ausencia de valor es el dato.
      valueEntrySchema.refine(
        (entry) =>
          entry.isUnavailable === true ||
          (entry.value !== null && entry.value !== ''),
        { message: 'La entrada debe tener un valor o estar marcada como no disponible' },
      ),
    )
    .min(1, 'Debe proporcionar al menos un valor'),
});

export type SaveDraftDto = z.infer<typeof saveDraftSchema>;
export type SubmitObservationsDto = z.infer<typeof submitObservationsSchema>;

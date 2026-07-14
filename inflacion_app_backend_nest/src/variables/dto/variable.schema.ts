import { z } from 'zod';

export const VARIABLE_DATA_TYPES = [
  'numeric',
  'categorical',
  'boolean',
  'text',
] as const;
export type VariableDataType = (typeof VARIABLE_DATA_TYPES)[number];

const numericConfigSchema = z.object({
  isCurrency: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  decimals: z.number().int().min(0).max(4).optional(),
});

const categoricalConfigSchema = z.object({
  options: z
    .array(z.string().trim().min(1))
    .min(2, 'Debe definir al menos 2 opciones'),
});

const textConfigSchema = z.object({
  maxLength: z.number().int().positive().optional(),
});

// Config por dataType -- reusado tanto acá (unión discriminada de
// createVariableSchema) como en variables.service.ts#update, para validar
// `config` contra el dataType ya persistido de la Variable (dataType no se
// puede cambiar en un update: cambiar el tipo de una variable con
// observaciones existentes las dejaría en un estado incoherente).
export function configSchemaFor(dataType: string) {
  switch (dataType) {
    case 'numeric':
      return numericConfigSchema.optional();
    case 'categorical':
      return categoricalConfigSchema;
    case 'boolean':
      return z.undefined();
    case 'text':
      return textConfigSchema.optional();
    default:
      throw new Error(`dataType desconocido: ${dataType}`);
  }
}

const baseFields = {
  name: z.string().trim().min(1, 'El nombre es requerido'),
  unit: z.string().trim().min(1).optional(),
  studyFieldId: z.number({ error: 'studyFieldId es requerido' }),
};

export const createVariableSchema = z.discriminatedUnion('dataType', [
  z.object({
    ...baseFields,
    dataType: z.literal('numeric'),
    config: numericConfigSchema.optional(),
  }),
  z.object({
    ...baseFields,
    dataType: z.literal('categorical'),
    config: categoricalConfigSchema,
  }),
  z.object({
    ...baseFields,
    dataType: z.literal('boolean'),
    config: z.undefined().optional(),
  }),
  z.object({
    ...baseFields,
    dataType: z.literal('text'),
    config: textConfigSchema.optional(),
  }),
]);

// dataType no es editable acá a propósito -- ver comentario de
// configSchemaFor. `config`, si se manda, se valida en el service contra el
// dataType actual de la variable (no se puede validar acá porque este
// schema no sabe el dataType persistido).
export const updateVariableSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  unit: z.string().trim().min(1).optional(),
  config: z.unknown().optional(),
});

export type CreateVariableDto = z.infer<typeof createVariableSchema>;
export type UpdateVariableDto = z.infer<typeof updateVariableSchema>;

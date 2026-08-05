import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { Variable } from '@prisma/client';

type VariableForValidation = Pick<Variable, 'id' | 'dataType' | 'config'>;

export interface ObservationValueFields {
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  choiceValue: string | null;
  isUnavailable: boolean;
}

// Extrae el valor "mostrable" de una Observation/DraftObservation ya leída
// de la base -- solo una de las cuatro columnas tipadas está poblada según
// el dataType de la Variable referenciada. `??` (no `||`) es a propósito:
// un booleanValue en `false` es un valor real, no la ausencia de uno.
export function pickObservationValue(row: {
  numericValue: unknown;
  textValue: string | null;
  booleanValue: boolean | null;
  choiceValue: string | null;
}): unknown {
  return (
    row.numericValue ??
    row.textValue ??
    row.booleanValue ??
    row.choiceValue ??
    null
  );
}

// Deriva un schema de Zod para el VALOR de una Observation/DraftObservation
// a partir del dataType real de la Variable -- nunca confiar en que el
// cliente declare el tipo, la Variable siempre se busca en la DB antes de
// llamar a esto (ver students.service.ts / admin.service.ts). Mismo patrón
// que variables/dto/variable.schema.ts#configSchemaFor, pero para el VALOR
// enviado por el usuario en vez de la config de la variable.
export function valueSchemaFor(variable: VariableForValidation) {
  switch (variable.dataType) {
    case 'numeric': {
      const cfg =
        (variable.config as { min?: number; max?: number } | null) ?? {};
      const max = cfg.max ?? 99999999;
      const min = cfg.min ?? 0.01;
      return z.coerce
        .number()
        .max(max, `El valor no puede superar ${max}`)
        .min(min, `El valor debe ser mayor o igual a ${min}`);
    }
    case 'categorical': {
      const cfg = variable.config as { options: string[] } | null;
      const options = cfg?.options ?? [];
      if (options.length === 0) {
        throw new BadRequestException(
          `La variable "${variable.id}" no tiene opciones configuradas`,
        );
      }
      return z.enum(options as [string, ...string[]]);
    }
    case 'boolean':
      return z.boolean();
    case 'text': {
      const cfg = (variable.config as { maxLength?: number } | null) ?? {};
      const base = z
        .string()
        .trim()
        .min(1, 'El valor de texto no puede estar vacío');
      return cfg.maxLength ? base.max(cfg.maxLength) : base;
    }
    default:
      throw new BadRequestException(
        `La variable "${variable.id}" tiene un dataType desconocido`,
      );
  }
}

// Valida un valor crudo (lo que llegó del cliente: number | string | boolean)
// contra el dataType real de la Variable, y devuelve en qué columna de
// Observation/DraftObservation debe guardarse -- solo una de las cuatro
// queda no-null, según variable.dataType.
export function toObservationValueFields(
  variable: VariableForValidation,
  rawValue: unknown,
  isUnavailable = false,
): ObservationValueFields {
  const empty: ObservationValueFields = {
    numericValue: null,
    textValue: null,
    booleanValue: null,
    choiceValue: null,
    isUnavailable: false,
  };

  // Fase AD: "no disponible" es una respuesta SIN valor. No se valida nada
  // contra el dataType (no hay qué validar) y las cuatro columnas de valor
  // quedan en NULL a propósito: es lo que mantiene a estas filas fuera de
  // promedios, canastas y distribuciones en admin/analysis.ts. Si el cliente
  // manda valor Y la marca, gana la marca -- el checkbox del wizard ya limpia
  // el valor al activarse, así que recibir ambos es un cliente desincronizado
  // y descartar el valor es la lectura conservadora.
  if (isUnavailable) {
    return { ...empty, isUnavailable: true };
  }

  const schema = valueSchemaFor(variable);
  const parsed = schema.safeParse(rawValue);

  if (!parsed.success) {
    throw new BadRequestException({
      message: `Valor inválido para la variable ${variable.id}`,
      errors: parsed.error.issues.map((issue) => ({
        field: `variableId:${variable.id}`,
        message: issue.message,
      })),
    });
  }

  const fields: ObservationValueFields = { ...empty };

  switch (variable.dataType) {
    case 'numeric':
      fields.numericValue = parsed.data as number;
      break;
    case 'categorical':
      fields.choiceValue = parsed.data as string;
      break;
    case 'boolean':
      fields.booleanValue = parsed.data as boolean;
      break;
    case 'text':
      fields.textValue = parsed.data as string;
      break;
  }

  return fields;
}

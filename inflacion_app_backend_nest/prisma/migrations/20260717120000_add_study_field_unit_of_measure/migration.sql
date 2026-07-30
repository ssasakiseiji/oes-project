-- Fase Z (2026-07-17): agrega la unidad de medida del CAMPO DE ESTUDIO — el
-- eje sobre el que se agrupan las métricas para que un análisis agregado sea
-- homogéneo.
--
-- Por qué en study_fields y no en variables: `variables.unit` ya existe, pero
-- guarda el descriptor de PRESENTACIÓN de la variable ('1 kg', '500 g', '2 L',
-- '400 ml') — la cantidad de referencia a la que se le observa un valor, no la
-- unidad en la que ese valor está medido. Todas las variables de 'Alimentos'
-- se observan en ₲ aunque sus presentaciones difieran; es ₲ (y no '1 kg') lo
-- que hace que sumarlas en una canasta tenga sentido. Los dos conceptos son
-- ortogonales, así que `variables.unit` se queda exactamente como está.
--
-- Nullable a propósito, y sin CHECK de vocabulario cerrado: un campo de
-- estudio puramente cualitativo (solo categóricas/booleanas/texto) no tiene
-- ninguna unidad que declarar, y NULL es la respuesta honesta ahí — no un
-- dato faltante. El backfill de abajo tampoco puede adivinar la unidad de un
-- campo numérico no monetario, así que esos también quedan NULL hasta que un
-- admin la cargue; el análisis cuantitativo de un campo sin unidad se reporta
-- como "sin unidad declarada" en vez de sumarse a ciegas (ver Fase AA).

ALTER TABLE "study_fields" ADD COLUMN "unit_of_measure" VARCHAR(50);

COMMENT ON COLUMN "study_fields"."unit_of_measure" IS
    'Unidad en la que se miden los valores observados de las variables numéricas de este campo (ej. ''₲'', ''°C'', ''%''). Eje de agrupación para métricas agregadas homogéneas. NULL = campo sin variables numéricas, o unidad todavía no declarada. Distinto de variables.unit, que es el descriptor de presentación (''1 kg'').';

-- Backfill conservador: solo los campos cuyas variables numéricas son TODAS
-- monetarias (config->>'isCurrency' = true) reciben '₲'. Ese era exactamente
-- el universo del getAnalysis pre-Fase-Z (dataType='numeric' AND
-- config.isCurrency=true), así que para esos campos '₲' no es una suposición:
-- es la unidad que el análisis de canasta ya venía asumiendo implícitamente.
--
-- Un campo con al menos una variable numérica NO monetaria (ej. el demo
-- 'Percepción y Contexto del Relevamiento', que tiene 'Temperatura ambiente'
-- en °C) queda deliberadamente en NULL — mezclarlo con ₲ es precisamente el
-- bug que esta fase existe para hacer imposible. Un campo sin ninguna variable
-- numérica también queda NULL (no hay nada que medir).
UPDATE "study_fields" sf
SET "unit_of_measure" = '₲'
WHERE EXISTS (
    SELECT 1 FROM "variables" v
    WHERE v."study_field_id" = sf."id"
      AND v."data_type" = 'numeric'
)
AND NOT EXISTS (
    SELECT 1 FROM "variables" v
    WHERE v."study_field_id" = sf."id"
      AND v."data_type" = 'numeric'
      AND COALESCE((v."config"->>'isCurrency')::boolean, false) = false
);

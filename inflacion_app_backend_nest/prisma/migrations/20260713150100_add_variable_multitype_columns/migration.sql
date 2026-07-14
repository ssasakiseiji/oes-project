-- Fase H (parte 2): agrega el soporte para que una Variable tenga un tipo
-- de dato (numeric/categorical/boolean/text) y para que una Observation
-- guarde el valor en la columna tipada correspondiente, en vez de asumir
-- siempre un Decimal de precio.
--
-- La columna `price` en observations/draft_observations se conserva por
-- ahora (se elimina recién en drop_legacy_price_columns, al final de
-- Fase I, cuando el backend deja de leerla/escribirla) para no dejar el
-- schema en un estado que rompa el backend actual entre el deploy de esta
-- migración y el de Fase I.

-- Variable: tipo de dato + configuración específica por tipo
ALTER TABLE "variables" ADD COLUMN "data_type" VARCHAR(20) NOT NULL DEFAULT 'numeric';
ALTER TABLE "variables" ADD COLUMN "config" JSONB;
ALTER TABLE "variables" ADD CONSTRAINT "variables_data_type_check"
  CHECK ("data_type" IN ('numeric', 'categorical', 'boolean', 'text'));

-- Observation / DraftObservation: columnas tipadas para el valor. Solo una
-- debería estar poblada por fila (la que corresponde al dataType de la
-- Variable referenciada) — Postgres no puede validar eso contra otra tabla,
-- así que queda enforced en el service layer (variable-value.ts, Fase I).
ALTER TABLE "observations" ADD COLUMN "numeric_value" DECIMAL(12,2);
ALTER TABLE "observations" ADD COLUMN "text_value" TEXT;
ALTER TABLE "observations" ADD COLUMN "boolean_value" BOOLEAN;
ALTER TABLE "observations" ADD COLUMN "choice_value" VARCHAR(255);

ALTER TABLE "draft_observations" ADD COLUMN "numeric_value" DECIMAL(12,2);
ALTER TABLE "draft_observations" ADD COLUMN "text_value" TEXT;
ALTER TABLE "draft_observations" ADD COLUMN "boolean_value" BOOLEAN;
ALTER TABLE "draft_observations" ADD COLUMN "choice_value" VARCHAR(255);

-- Backfill: hasta ahora todo lo recolectado era numérico/monetario (precios),
-- así que toda Variable/Observation/DraftObservation existente se marca
-- como tal. `price` es NOT NULL en el schema original, así que este UPDATE
-- cubre el 100% de las filas preexistentes.
UPDATE "variables" SET "config" = '{"isCurrency": true}'::jsonb;
UPDATE "observations" SET "numeric_value" = "price";
UPDATE "draft_observations" SET "numeric_value" = "price";

-- `price` queda deprecada pero se conserva (columna, no dato) hasta
-- drop_legacy_price_columns al final de Fase I -- se relaja a nullable acá
-- porque el código de Fase I deja de escribirla y solo escribe las
-- columnas *_value nuevas.
ALTER TABLE "observations" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "draft_observations" ALTER COLUMN "price" DROP NOT NULL;

-- A partir de acá toda fila debe tener al menos un valor tipado poblado.
ALTER TABLE "observations" ADD CONSTRAINT "observations_value_presence_check"
  CHECK ("numeric_value" IS NOT NULL OR "text_value" IS NOT NULL OR "boolean_value" IS NOT NULL OR "choice_value" IS NOT NULL);
ALTER TABLE "draft_observations" ADD CONSTRAINT "draft_observations_value_presence_check"
  CHECK ("numeric_value" IS NOT NULL OR "text_value" IS NOT NULL OR "boolean_value" IS NOT NULL OR "choice_value" IS NOT NULL);

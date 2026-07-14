-- Fase I (cierre): el backend ya no lee ni escribe `price` en
-- observations/draft_observations -- todo el código nuevo usa
-- numeric_value/text_value/boolean_value/choice_value (ver
-- add_variable_multitype_columns, Fase H). Elimina la columna legacy.

ALTER TABLE "observations" DROP COLUMN "price";
ALTER TABLE "draft_observations" DROP COLUMN "price";

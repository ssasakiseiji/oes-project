-- Arregla el choque entre Fase I y Fase AD.
--
-- Fase I (20260713150100) puso "toda fila debe tener al menos un valor tipado
-- poblado". Fase AD (20260805120000) agregó is_unavailable justamente para
-- registrar la respuesta OPUESTA -- el estudiante fue, miró y no había nada
-- que observar -- que por definición deja las cuatro columnas de valor en
-- NULL. La columna se agregó sin revisar el CHECK, así que guardar el
-- borrador de una variable marcada "no disponible" reventaba con
-- draft_observations_value_presence_check (23514) y el estudiante veía un
-- Internal Server Error al enviar el formulario.
--
-- La regla nueva dice las dos mitades del dominio en vez de una sola:
--
--   is_unavailable = true  -> las cuatro columnas de valor DEBEN ser NULL.
--   is_unavailable = false -> al menos una DEBE estar poblada (Fase I, igual).
--
-- La primera mitad no estaba en la base hasta ahora: la garantizaba sólo
-- toObservationValueFields, que descarta el valor cuando viene la marca. Vale
-- la pena escribirla acá porque el motor de análisis se apoya en ella --
-- summarizeNumeric descarta por numeric_value NULL, así que una fila "no
-- disponible" con un precio adentro se colaría en promedios y canastas.

ALTER TABLE "observations"
    DROP CONSTRAINT "observations_value_presence_check";

ALTER TABLE "observations" ADD CONSTRAINT "observations_value_presence_check"
  CHECK (
    (
      "is_unavailable"
      AND "numeric_value" IS NULL
      AND "text_value" IS NULL
      AND "boolean_value" IS NULL
      AND "choice_value" IS NULL
    )
    OR (
      NOT "is_unavailable"
      AND (
        "numeric_value" IS NOT NULL
        OR "text_value" IS NOT NULL
        OR "boolean_value" IS NOT NULL
        OR "choice_value" IS NOT NULL
      )
    )
  );

ALTER TABLE "draft_observations"
    DROP CONSTRAINT "draft_observations_value_presence_check";

ALTER TABLE "draft_observations" ADD CONSTRAINT "draft_observations_value_presence_check"
  CHECK (
    (
      "is_unavailable"
      AND "numeric_value" IS NULL
      AND "text_value" IS NULL
      AND "boolean_value" IS NULL
      AND "choice_value" IS NULL
    )
    OR (
      NOT "is_unavailable"
      AND (
        "numeric_value" IS NOT NULL
        OR "text_value" IS NOT NULL
        OR "boolean_value" IS NOT NULL
        OR "choice_value" IS NOT NULL
      )
    )
  );

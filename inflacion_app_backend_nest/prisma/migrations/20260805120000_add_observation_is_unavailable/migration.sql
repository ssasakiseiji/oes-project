-- Fase AD (2026-08-05): "no disponible" pasa a ser un dato del dominio.
--
-- El wizard de registro ya tenía un checkbox "Marcar como no disponible", pero
-- era estado transitorio de UI: al cambiar de paso se reseteaba y nada de eso
-- llegaba a la base. La razón era estructural — no existía forma de distinguir
-- "el estudiante fue, miró y no había" de "todavía no lo cargó": ambos casos
-- dejaban las cuatro columnas de valor (numeric/text/boolean/choice) en NULL.
--
-- Esta columna hace esa distinción explícita. En una encuesta de precios "el
-- producto no estaba en góndola" no es un dato faltante: es la observación.
--
-- NOT NULL DEFAULT false: toda fila existente es, por definición, una
-- observación con valor -- ninguna se creó nunca con la marca puesta, así que
-- el default no adivina nada sobre el histórico.
--
-- Se agrega a las dos tablas: en draft_observations la fila existe únicamente
-- para sostener la marca (todas las columnas de valor quedan en NULL), que es
-- lo que la hace sobrevivir a cerrar y reabrir el wizard.
--
-- El motor de análisis (admin/analysis.ts) no necesita cambios: summarizeNumeric
-- descarta filas con numeric_value NULL y summarizeQualitative descarta las que
-- no tienen ninguna columna de valor poblada, así que una observación "no
-- disponible" queda fuera de promedios, canastas y distribuciones por
-- construcción -- no se puede promediar un precio que no existió.

ALTER TABLE "observations"
    ADD COLUMN "is_unavailable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "draft_observations"
    ADD COLUMN "is_unavailable" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "observations"."is_unavailable" IS
    'true = el estudiante relevó la variable y no había nada que observar (producto ausente, local cerrado). Es una respuesta, no un dato faltante: cuenta como variable relevada para el progreso del estudiante, se excluye de promedios/canastas (sus columnas de valor van todas en NULL), y el panel de monitor la descuenta al calcular la completitud real.';

COMMENT ON COLUMN "draft_observations"."is_unavailable" IS
    'Ver observations.is_unavailable. En el borrador la fila existe solo para persistir la marca entre visitas al mismo paso del wizard.';

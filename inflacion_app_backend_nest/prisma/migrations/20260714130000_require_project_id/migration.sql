-- Fase T (parte 1, 2026-07-14): cierra la migración aditiva de Fase O --
-- ahora que Fases Q/R/S ya scopean por proyecto todo el backend que lee o
-- escribe study_fields/observation_units/periods, project_id pasa a NOT
-- NULL en las 3 tablas. Verificado antes de aplicar esta migración: 0 filas
-- con project_id NULL en las 3 tablas (el backfill de Fase O cubrió todo lo
-- preexistente, y todo el código escrito desde Fase Q en adelante siempre
-- lo completa).

ALTER TABLE "study_fields" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "observation_units" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "periods" ALTER COLUMN "project_id" SET NOT NULL;

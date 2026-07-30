-- Fase H (parte 1): renombra las entidades del dominio a vocabulario
-- genérico (categorías/productos/comercios/precios -> campos de estudio/
-- variables/unidades de observación/observaciones), preservando todos los
-- datos vía ALTER TABLE ... RENAME (Postgres conserva filas, FKs e índices
-- al renombrar tablas/columnas/constraints — no es un DROP+CREATE).
--
-- Las columnas `price` NO se tocan todavía en esta migración; eso ocurre
-- en add_variable_multitype_columns (backfill a numeric_value) y, recién
-- al final de Fase I cuando el backend ya no las lee, en
-- drop_legacy_price_columns.

-- Tablas
ALTER TABLE "categories" RENAME TO "study_fields";
ALTER TABLE "products" RENAME TO "variables";
ALTER TABLE "commerces" RENAME TO "observation_units";
ALTER TABLE "prices" RENAME TO "observations";
ALTER TABLE "draft_prices" RENAME TO "draft_observations";
ALTER TABLE "commerce_assignments" RENAME TO "observation_unit_assignments";

-- Secuencias (cosmético — el DEFAULT nextval(...) sigue funcionando aunque
-- no se rename, pero esto deja las secuencias con el mismo nombre que
-- generaría un `prisma migrate dev` fresco sobre el schema ya renombrado)
ALTER SEQUENCE "categories_id_seq" RENAME TO "study_fields_id_seq";
ALTER SEQUENCE "products_id_seq" RENAME TO "variables_id_seq";
ALTER SEQUENCE "commerces_id_seq" RENAME TO "observation_units_id_seq";
ALTER SEQUENCE "prices_id_seq" RENAME TO "observations_id_seq";
ALTER SEQUENCE "draft_prices_id_seq" RENAME TO "draft_observations_id_seq";
ALTER SEQUENCE "commerce_assignments_id_seq" RENAME TO "observation_unit_assignments_id_seq";

-- Columnas
ALTER TABLE "variables" RENAME COLUMN "category_id" TO "study_field_id";
ALTER TABLE "variables" ALTER COLUMN "unit" DROP NOT NULL;
ALTER TABLE "observations" RENAME COLUMN "product_id" TO "variable_id";
ALTER TABLE "observations" RENAME COLUMN "commerce_id" TO "observation_unit_id";
ALTER TABLE "draft_observations" RENAME COLUMN "product_id" TO "variable_id";
ALTER TABLE "draft_observations" RENAME COLUMN "commerce_id" TO "observation_unit_id";
ALTER TABLE "observation_unit_assignments" RENAME COLUMN "commerce_id" TO "observation_unit_id";

-- Primary keys (constraints reales, agregadas inline en el CREATE TABLE original)
ALTER TABLE "study_fields" RENAME CONSTRAINT "categories_pkey" TO "study_fields_pkey";
ALTER TABLE "variables" RENAME CONSTRAINT "products_pkey" TO "variables_pkey";
ALTER TABLE "observation_units" RENAME CONSTRAINT "commerces_pkey" TO "observation_units_pkey";
ALTER TABLE "observations" RENAME CONSTRAINT "prices_pkey" TO "observations_pkey";
ALTER TABLE "draft_observations" RENAME CONSTRAINT "draft_prices_pkey" TO "draft_observations_pkey";
ALTER TABLE "observation_unit_assignments" RENAME CONSTRAINT "commerce_assignments_pkey" TO "observation_unit_assignments_pkey";

-- Índices planos (CREATE INDEX, no constraints -> se renombran con ALTER INDEX)
ALTER INDEX "idx_products_category" RENAME TO "idx_variables_study_field";
ALTER INDEX "idx_prices_period" RENAME TO "idx_observations_period";
ALTER INDEX "idx_prices_product" RENAME TO "idx_observations_variable";
ALTER INDEX "idx_prices_user" RENAME TO "idx_observations_user";
ALTER INDEX "idx_prices_commerce" RENAME TO "idx_observations_observation_unit";
ALTER INDEX "idx_prices_user_period_commerce" RENAME TO "idx_observations_user_period_observation_unit";
ALTER INDEX "idx_draft_prices_user_commerce_period" RENAME TO "idx_draft_observations_user_observation_unit_period";
ALTER INDEX "idx_commerce_assignments_user" RENAME TO "idx_observation_unit_assignments_user";
ALTER INDEX "idx_commerce_assignments_commerce" RENAME TO "idx_observation_unit_assignments_observation_unit";

-- Índices únicos (también CREATE UNIQUE INDEX, no ADD CONSTRAINT UNIQUE, en
-- el baseline -> también van con ALTER INDEX, no RENAME CONSTRAINT)
ALTER INDEX "prices_unique_submission" RENAME TO "observations_unique_submission";
ALTER INDEX "commerce_assignments_user_id_commerce_id_key" RENAME TO "observation_unit_assignments_user_id_observation_unit_id_key";

-- Foreign keys (constraints reales, agregadas vía ALTER TABLE ADD CONSTRAINT)
ALTER TABLE "variables" RENAME CONSTRAINT "products_category_id_fkey" TO "variables_study_field_id_fkey";
ALTER TABLE "observations" RENAME CONSTRAINT "prices_period_id_fkey" TO "observations_period_id_fkey";
ALTER TABLE "observations" RENAME CONSTRAINT "prices_product_id_fkey" TO "observations_variable_id_fkey";
ALTER TABLE "observations" RENAME CONSTRAINT "prices_user_id_fkey" TO "observations_user_id_fkey";
ALTER TABLE "observations" RENAME CONSTRAINT "prices_commerce_id_fkey" TO "observations_observation_unit_id_fkey";
ALTER TABLE "draft_observations" RENAME CONSTRAINT "draft_prices_period_id_fkey" TO "draft_observations_period_id_fkey";
ALTER TABLE "draft_observations" RENAME CONSTRAINT "draft_prices_product_id_fkey" TO "draft_observations_variable_id_fkey";
ALTER TABLE "draft_observations" RENAME CONSTRAINT "draft_prices_user_id_fkey" TO "draft_observations_user_id_fkey";
ALTER TABLE "draft_observations" RENAME CONSTRAINT "draft_prices_commerce_id_fkey" TO "draft_observations_observation_unit_id_fkey";
ALTER TABLE "observation_unit_assignments" RENAME CONSTRAINT "commerce_assignments_user_id_fkey" TO "observation_unit_assignments_user_id_fkey";
ALTER TABLE "observation_unit_assignments" RENAME CONSTRAINT "commerce_assignments_commerce_id_fkey" TO "observation_unit_assignments_observation_unit_id_fkey";
ALTER TABLE "observation_unit_assignments" RENAME CONSTRAINT "commerce_assignments_assigned_by_fkey" TO "observation_unit_assignments_assigned_by_fkey";

-- Comments (heredados de add-commerce-assignments.sql, actualizados al nuevo vocabulario)
COMMENT ON TABLE "observation_unit_assignments" IS 'Manages the assignment of observation units to students';
COMMENT ON COLUMN "observation_unit_assignments"."user_id" IS 'Student user ID';
COMMENT ON COLUMN "observation_unit_assignments"."observation_unit_id" IS 'Observation unit ID assigned to the student';
COMMENT ON COLUMN "observation_unit_assignments"."assigned_by" IS 'Admin user who made the assignment';

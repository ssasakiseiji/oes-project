-- Fase O (2026-07-14): agrega el concepto de "Project" — soporte para correr
-- múltiples campañas de recolección de datos completamente aisladas dentro
-- de la misma instancia (ej. "Encuesta de Precios" y "Encuesta de Percepción
-- en el Rally"), compartiendo la tabla de usuarios. No es multi-tenancy: una
-- sola DB, un solo deploy, sin aislamiento de infraestructura.
--
-- Migración PURAMENTE ADITIVA — deployable sola, en cualquier momento, sin
-- requerir que el backend/frontend ya sepan de proyectos: crea las tablas
-- nuevas, agrega project_id NULLABLE a study_fields/observation_units/
-- periods (no NOT NULL todavía), backfillea todo lo existente a un Project
-- por defecto, y otorga 'superadmin' de forma ADITIVA (sin quitar los roles
-- legacy 'admin'/'monitor'/'student') a quien hoy sea 'admin' global.
--
-- Por qué aditivo y no directo: si esta misma migración ya vaciara
-- users.roles a solo 'superadmin', cada RolesGuard/@Roles(...) del código
-- actual (que todavía no sabe de ProjectMembership) empezaría a fallar antes
-- de que Fase P (ProjectRolesGuard) esté implementada. Mismo principio que
-- "columna nullable -> backfill -> NOT NULL" ya usado en Fase H
-- (add_variable_multitype_columns / drop_legacy_price_columns). La limpieza
-- destructiva (project_id NOT NULL en las 3 tablas, roles legacy fuera)
-- queda para la migración de cierre de Fase T, una vez que Fases Q/R/S ya
-- estén deployadas.

-- === Tablas nuevas ===

CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- roles reusa la misma forma (TEXT[]) que users.roles tenía antes de esta
-- migración, para que el backfill de abajo sea una copia directa.
CREATE TABLE "project_memberships" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "project_memberships_project_id_user_id_key" ON "project_memberships"("project_id", "user_id");
CREATE INDEX "idx_project_memberships_user" ON "project_memberships"("user_id");
CREATE INDEX "idx_project_memberships_project" ON "project_memberships"("project_id");

-- === project_id (nullable) en las tablas de catálogo ===

ALTER TABLE "study_fields" ADD COLUMN "project_id" INTEGER;
ALTER TABLE "observation_units" ADD COLUMN "project_id" INTEGER;
ALTER TABLE "periods" ADD COLUMN "project_id" INTEGER;

ALTER TABLE "study_fields" ADD CONSTRAINT "study_fields_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "observation_units" ADD CONSTRAINT "observation_units_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "periods" ADD CONSTRAINT "periods_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Postgres no indexa automáticamente las columnas FK.
CREATE INDEX "idx_study_fields_project" ON "study_fields"("project_id");
CREATE INDEX "idx_observation_units_project" ON "observation_units"("project_id");
CREATE INDEX "idx_periods_project" ON "periods"("project_id");

-- === Backfill: proyecto por defecto para todo lo existente ===

INSERT INTO "projects" ("name", "description")
VALUES ('Encuesta de Precios', 'Proyecto migrado automáticamente al introducir soporte multi-proyecto (Fase O).');

UPDATE "study_fields" SET "project_id" = (SELECT "id" FROM "projects" WHERE "name" = 'Encuesta de Precios');
UPDATE "observation_units" SET "project_id" = (SELECT "id" FROM "projects" WHERE "name" = 'Encuesta de Precios');
UPDATE "periods" SET "project_id" = (SELECT "id" FROM "projects" WHERE "name" = 'Encuesta de Precios');

-- Cada usuario existente gana una ProjectMembership en el proyecto por
-- defecto, copiando literalmente su `roles` global de hoy — así ningún
-- admin/monitor/student pierde acceso al desplegar esta migración. Usuarios
-- sin roles (roles = '{}') no ganan membership (no tenían ningún acceso que
-- preservar).
INSERT INTO "project_memberships" ("project_id", "user_id", "roles")
SELECT (SELECT "id" FROM "projects" WHERE "name" = 'Encuesta de Precios'), "id", "roles"
FROM "users"
WHERE array_length("roles", 1) > 0;

-- === Period.month/year: pasa de único global a único por proyecto ===
--
-- Se hace ya en esta migración aditiva (no se difiere a la de cierre de Fase
-- T): de lo contrario, apenas Fase R deje crear períodos scoped por
-- proyecto, dos proyectos legítimamente distintos no podrían tener cada uno
-- su propio período "Julio 2026" hasta que corriera la migración de cierre
-- — una ventana de bug real evitable sin costo, ya que project_id nullable
-- con un único valor backfilleado se comporta igual que antes hasta que
-- exista un segundo proyecto.
DROP INDEX "periods_month_year_key";
CREATE UNIQUE INDEX "periods_project_id_month_year_key" ON "periods"("project_id", "month", "year");

-- === Grant aditivo de superadmin ===
--
-- No se quita ningún rol legacy todavía — eso rompería RolesGuard/@Roles(...)
-- en los controllers que Fases P-S todavía no migraron a ProjectRolesGuard.
-- Se retira recién en la migración de cierre (Fase T), una vez el código ya
-- no lea `roles` global para admin/monitor/student.
UPDATE "users"
SET "roles" = ARRAY(SELECT DISTINCT unnest("roles" || ARRAY['superadmin']))
WHERE 'admin' = ANY("roles");

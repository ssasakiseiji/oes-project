-- Migración baseline (Fase G): reproduce el schema creado a mano por
-- supabase-setup.sql + inflacion_app_backend/migrations/*.sql, para que
-- Prisma Migrate pase a ser la fuente de verdad de acá en adelante.
--
-- Generada con `prisma migrate diff --from-empty --to-schema` y luego
-- editada a mano para agregar los check constraints y comments que Prisma
-- no modela (ver bloque al final del archivo) — sin esto, un
-- `prisma migrate deploy` contra una base nueva quedaría con menos
-- validaciones que la base original.
--
-- Verificada (2026-07-13): aplicada contra un Postgres 16 vacío y luego
-- introspeccionada con `prisma db pull` — coincide campo por campo con
-- prisma/schema.prisma (mismo método que la verificación de Fase F).
--
-- Para una base EXISTENTE que ya tiene este schema (ej. Supabase de
-- producción, creada a mano con los SQL de arriba): no correr esta
-- migración directamente (fallaría con "relation already exists").
-- En su lugar, marcarla como ya aplicada una sola vez:
--   npx prisma migrate resolve --applied 0_init
-- (ver README / docs de deploy para el procedimiento completo).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY['student']::TEXT[],
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "category_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerces" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "period_id" INTEGER,
    "product_id" INTEGER,
    "user_id" INTEGER,
    "commerce_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_prices" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "period_id" INTEGER,
    "product_id" INTEGER,
    "user_id" INTEGER,
    "commerce_id" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_assignments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "commerce_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" INTEGER,

    CONSTRAINT "commerce_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "periods_month_year_key" ON "periods"("month", "year");

-- CreateIndex
CREATE INDEX "idx_prices_period" ON "prices"("period_id");

-- CreateIndex
CREATE INDEX "idx_prices_product" ON "prices"("product_id");

-- CreateIndex
CREATE INDEX "idx_prices_user" ON "prices"("user_id");

-- CreateIndex
CREATE INDEX "idx_prices_commerce" ON "prices"("commerce_id");

-- CreateIndex
CREATE INDEX "idx_prices_user_period_commerce" ON "prices"("user_id", "period_id", "commerce_id");

-- CreateIndex
CREATE UNIQUE INDEX "prices_unique_submission" ON "prices"("user_id", "product_id", "commerce_id", "period_id");

-- CreateIndex
CREATE INDEX "idx_draft_prices_user_commerce_period" ON "draft_prices"("user_id", "commerce_id", "period_id");

-- CreateIndex
CREATE INDEX "idx_commerce_assignments_user" ON "commerce_assignments"("user_id");

-- CreateIndex
CREATE INDEX "idx_commerce_assignments_commerce" ON "commerce_assignments"("commerce_id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_assignments_user_id_commerce_id_key" ON "commerce_assignments"("user_id", "commerce_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_commerce_id_fkey" FOREIGN KEY ("commerce_id") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "draft_prices" ADD CONSTRAINT "draft_prices_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "draft_prices" ADD CONSTRAINT "draft_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "draft_prices" ADD CONSTRAINT "draft_prices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "draft_prices" ADD CONSTRAINT "draft_prices_commerce_id_fkey" FOREIGN KEY ("commerce_id") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_assignments" ADD CONSTRAINT "commerce_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_assignments" ADD CONSTRAINT "commerce_assignments_commerce_id_fkey" FOREIGN KEY ("commerce_id") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce_assignments" ADD CONSTRAINT "commerce_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- Prisma no modela check constraints ni comments de tabla/columna, así que
-- se agregan a mano acá para que la migración baseline reproduzca
-- supabase-setup.sql / add-commerce-assignments.sql exactamente.

-- CheckConstraint (supabase-setup.sql)
ALTER TABLE "periods" ADD CONSTRAINT "periods_month_check" CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "periods" ADD CONSTRAINT "periods_status_check" CHECK ("status" IN ('Scheduled', 'Open', 'Closed'));

-- Comments (migrations/add-commerce-assignments.sql)
COMMENT ON TABLE "commerce_assignments" IS 'Manages the assignment of commerces to students';
COMMENT ON COLUMN "commerce_assignments"."user_id" IS 'Student user ID';
COMMENT ON COLUMN "commerce_assignments"."commerce_id" IS 'Commerce ID assigned to the student';
COMMENT ON COLUMN "commerce_assignments"."assigned_by" IS 'Admin user who made the assignment';

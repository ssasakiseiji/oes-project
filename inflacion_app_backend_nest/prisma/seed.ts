import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Reproduce los INSERT de supabase-setup.sql (sección "3. INSERTAR DATOS
// INICIALES") vía Prisma Client, ya que `prisma migrate deploy` solo crea
// el schema, no datos — ver Fase G. Idempotente (upsert/skipDuplicates),
// seguro de correr más de una vez.
//
// Estas son credenciales de PRUEBA (mismo comentario que tenía el SQL
// original) — no pensado para correr automáticamente en producción real,
// por eso NO está enganchado a `prisma migrate deploy`. Correr a mano con
// `npx prisma db seed` cuando se quiera esta data de demo/test.
//
// Fase M (2026-07-14): accessors renombrados a los modelos de Fase H
// (studyField/variable/observationUnit/observationUnitAssignment). Los
// variables sembrados originalmente son todos numéricos-moneda (precios),
// así que quedan marcados dataType:'numeric', config:{isCurrency:true} —
// mismo backfill que hizo la migración 20260713150100 para las filas ya
// existentes en Observation/DraftObservation. Se agrega además un
// StudyField de demo nuevo con un Variable de cada uno de los 4 dataTypes
// para que la capacidad multi-tipo sea demostrable sin tener que crearlos
// a mano desde el admin UI.
const useSsl = process.env.DB_SSL !== 'false';
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  }),
});

async function main() {
  // study_fields/variables/observation_units no tienen unique constraint en
  // name (ni lo tenían en el SQL original), así que skipDuplicates no las
  // protege de duplicarse en una segunda corrida — a diferencia de users/
  // periods/observation_unit_assignments, que sí tienen unique constraints
  // reales. Este guard hace que correr el seed dos veces sobre la misma
  // base sea un no-op completo en vez de duplicar esas tablas.
  const alreadySeeded = await prisma.user.findUnique({
    where: { email: 'admin@portalipc.com' },
  });
  if (alreadySeeded) {
    console.log('Ya seedeado (admin@portalipc.com existe) — nada que hacer.');
    return;
  }

  await prisma.studyField.createMany({
    data: [
      { name: 'Alimentos' },
      { name: 'Bebidas' },
      { name: 'Productos de Limpieza' },
      { name: 'Productos de Cuidado Personal' },
      { name: 'Lácteos' },
    ],
    skipDuplicates: true,
  });
  const studyFields = await prisma.studyField.findMany();
  const studyFieldIdByName = new Map(studyFields.map((c) => [c.name, c.id]));

  await prisma.variable.createMany({
    data: [
      { name: 'Arroz', unit: '1 kg', studyFieldId: studyFieldIdByName.get('Alimentos') },
      { name: 'Frijoles', unit: '1 kg', studyFieldId: studyFieldIdByName.get('Alimentos') },
      { name: 'Aceite', unit: '1 L', studyFieldId: studyFieldIdByName.get('Alimentos') },
      { name: 'Azúcar', unit: '1 kg', studyFieldId: studyFieldIdByName.get('Alimentos') },
      { name: 'Pan', unit: '500 g', studyFieldId: studyFieldIdByName.get('Alimentos') },
      { name: 'Leche', unit: '1 L', studyFieldId: studyFieldIdByName.get('Lácteos') },
      { name: 'Queso', unit: '500 g', studyFieldId: studyFieldIdByName.get('Lácteos') },
      { name: 'Yogurt', unit: '1 L', studyFieldId: studyFieldIdByName.get('Lácteos') },
      { name: 'Coca Cola', unit: '2 L', studyFieldId: studyFieldIdByName.get('Bebidas') },
      { name: 'Agua', unit: '1.5 L', studyFieldId: studyFieldIdByName.get('Bebidas') },
      { name: 'Jugo', unit: '1 L', studyFieldId: studyFieldIdByName.get('Bebidas') },
      { name: 'Detergente', unit: '1 kg', studyFieldId: studyFieldIdByName.get('Productos de Limpieza') },
      { name: 'Jabón', unit: '1 unidad', studyFieldId: studyFieldIdByName.get('Productos de Limpieza') },
      { name: 'Champú', unit: '400 ml', studyFieldId: studyFieldIdByName.get('Productos de Cuidado Personal') },
      { name: 'Pasta Dental', unit: '1 unidad', studyFieldId: studyFieldIdByName.get('Productos de Cuidado Personal') },
    ].map((v) => ({ ...v, dataType: 'numeric', config: { isCurrency: true } })),
    skipDuplicates: true,
  });

  // StudyField de demo para mostrar los otros 3 dataTypes (categórico,
  // booleano, texto) además del numérico-moneda de arriba.
  await prisma.studyField.createMany({
    data: [{ name: 'Percepción y Contexto del Relevamiento' }],
    skipDuplicates: true,
  });
  const perceptionField = await prisma.studyField.findFirst({
    where: { name: 'Percepción y Contexto del Relevamiento' },
  });

  await prisma.variable.createMany({
    data: [
      {
        name: 'Temperatura ambiente',
        unit: '°C',
        dataType: 'numeric',
        config: { isCurrency: false, min: -10, max: 50, decimals: 1 },
        studyFieldId: perceptionField?.id,
      },
      {
        name: 'Nivel de afluencia percibido',
        dataType: 'categorical',
        config: { options: ['Bajo', 'Medio', 'Alto'] },
        studyFieldId: perceptionField?.id,
      },
      {
        name: '¿El local tenía cartel de precios visible?',
        dataType: 'boolean',
        studyFieldId: perceptionField?.id,
      },
      {
        name: 'Observaciones adicionales',
        dataType: 'text',
        config: { maxLength: 500 },
        studyFieldId: perceptionField?.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.observationUnit.createMany({
    data: [
      { name: 'Supermercado Central', address: 'Av. Principal 123' },
      { name: 'Tienda La Economía', address: 'Calle 5 # 45-67' },
      { name: 'Minimarket San José', address: 'Carrera 10 # 20-30' },
      { name: 'Supermercado Express', address: 'Av. Comercial 456' },
    ],
    skipDuplicates: true,
  });

  // Mismos hashes bcrypt que supabase-setup.sql, para que las credenciales
  // de prueba (admin123/monitor123/student123) sigan funcionando igual.
  await prisma.user.createMany({
    data: [
      {
        name: 'Admin Usuario',
        email: 'admin@portalipc.com',
        passwordHash: '$2b$10$P6Ca1MqjGNSYrZRY9aOLjusjtdfV5QGxq6EXPgsmCd8lYx/Lh/sma',
        roles: ['admin'],
      },
      {
        name: 'Monitor Usuario',
        email: 'monitor@portalipc.com',
        passwordHash: '$2b$10$O6WVztZ.aeZ9fGmSjnVM/uc5qhYTqEJ0KoboZ3y.hJBl98lMky2E6',
        roles: ['monitor'],
      },
      {
        name: 'Juan Pérez',
        email: 'juan@portalipc.com',
        passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        roles: ['student'],
      },
      {
        name: 'María García',
        email: 'maria@portalipc.com',
        passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        roles: ['student'],
      },
      {
        name: 'Carlos López',
        email: 'carlos@portalipc.com',
        passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        roles: ['student'],
      },
    ],
    skipDuplicates: true,
  });

  await prisma.period.createMany({
    data: [
      { name: 'Enero 2025', month: 1, year: 2025, startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31'), status: 'Closed' },
      { name: 'Febrero 2025', month: 2, year: 2025, startDate: new Date('2025-02-01'), endDate: new Date('2025-02-28'), status: 'Closed' },
      { name: 'Marzo 2025', month: 3, year: 2025, startDate: new Date('2025-03-01'), endDate: new Date('2025-03-31'), status: 'Closed' },
      { name: 'Octubre 2025', month: 10, year: 2025, startDate: new Date('2025-10-01'), endDate: new Date('2025-10-31'), status: 'Open' },
    ],
    skipDuplicates: true,
  });

  // Asignar todas las unidades de observación a todos los estudiantes (por
  // defecto), igual que el SELECT ... CROSS JOIN del SQL original.
  const students = await prisma.user.findMany({ where: { roles: { has: 'student' } } });
  const observationUnits = await prisma.observationUnit.findMany();
  await prisma.observationUnitAssignment.createMany({
    data: students.flatMap((student) =>
      observationUnits.map((unit) => ({ userId: student.id, observationUnitId: unit.id })),
    ),
    skipDuplicates: true,
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

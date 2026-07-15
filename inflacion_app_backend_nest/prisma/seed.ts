import { PrismaClient, Prisma } from '@prisma/client';
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
//
// Fase Y (2026-07-14): reescrito para el soporte multi-proyecto (Fase
// O-X). Todo lo que antes era global (StudyField/Variable vía su
// StudyField/ObservationUnit/Period) ahora es NOT NULL en projectId, así
// que este script ya no corre contra el schema actual sin esto. Se
// siembran 2 proyectos con memberships mixtas a propósito: María es
// miembro de AMBOS (para poder probar el selector de proyecto del
// frontend), el resto de un solo proyecto (para probar el auto-select).
const useSsl = process.env.DB_SSL !== 'false';
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  }),
});

// Project.name no tiene unique constraint (decisión de schema -- dos
// proyectos distintos podrían coincidir en nombre en una instalación
// real), así que un create() directo no es idempotente ante un reintento.
// findFirst-then-create replica el mismo espíritu que skipDuplicates usa
// para study_fields/variables/observation_units más abajo, pero a mano
// porque createMany no devuelve las filas creadas y acá necesitamos el id.
async function findOrCreateProject(
  tx: Prisma.TransactionClient,
  data: { name: string; description: string },
) {
  const existing = await tx.project.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return tx.project.create({ data });
}

async function main() {
  // study_fields/variables/observation_units no tienen unique constraint en
  // name (ni lo tenían en el SQL original), así que skipDuplicates no las
  // protege de duplicarse en una segunda corrida — a diferencia de users/
  // periods/project_memberships/observation_unit_assignments, que sí tienen
  // unique constraints reales. El guard de admin@portalipc.com hace que
  // correr el seed dos veces sobre la misma base sea un no-op, PERO eso
  // por sí solo no alcanza: si una corrida se corta a mitad de camino (ej.
  // un blip de conexión), sin transacción quedarían proyectos/campos ya
  // creados sin el usuario admin todavía insertado, y una segunda corrida
  // volvería a pasar el guard y duplicaría todo lo de la primera mitad.
  // Todo el seed corre dentro de una única transacción para que sea
  // atómico -- o se aplica completo, o no se aplica nada. Verificado
  // repetidamente contra una DB descartable durante Fase Y: aun así, un
  // reintento interno de Prisma en la conexión inicial puede re-invocar el
  // callback una vez más de lo esperado -- de ahí findOrCreateProject en
  // vez de un create() directo para los dos Project (los únicos creados
  // fuera de un createMany con skipDuplicates).
  await prisma.$transaction(async (tx) => {
    const alreadySeeded = await tx.user.findUnique({
      where: { email: 'admin@portalipc.com' },
    });
    if (alreadySeeded) {
      console.log('Ya seedeado (admin@portalipc.com existe) — nada que hacer.');
      return;
    }

    // ---------- Proyectos ----------
    const precios = await findOrCreateProject(tx, {
      name: 'Encuesta de Precios',
      description: 'Recolección mensual de precios al consumidor.',
    });
    const rally = await findOrCreateProject(tx, {
      name: 'Encuesta del Rally',
      description: 'Encuesta de percepción en el Rally, proyecto secundario de demo.',
    });

    // ---------- Usuarios (post Fase T: User.roles solo puede ser [] o ['superadmin']) ----------
    // Mismos hashes bcrypt que supabase-setup.sql, para que las credenciales
    // de prueba (admin123/monitor123/student123) sigan funcionando igual.
    await tx.user.createMany({
      data: [
        {
          name: 'Admin Usuario',
          email: 'admin@portalipc.com',
          passwordHash: '$2b$10$P6Ca1MqjGNSYrZRY9aOLjusjtdfV5QGxq6EXPgsmCd8lYx/Lh/sma',
          roles: ['superadmin'],
        },
        {
          name: 'Monitor Usuario',
          email: 'monitor@portalipc.com',
          passwordHash: '$2b$10$O6WVztZ.aeZ9fGmSjnVM/uc5qhYTqEJ0KoboZ3y.hJBl98lMky2E6',
        },
        {
          name: 'Juan Pérez',
          email: 'juan@portalipc.com',
          passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        },
        {
          name: 'María García',
          email: 'maria@portalipc.com',
          passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        },
        {
          name: 'Carlos López',
          email: 'carlos@portalipc.com',
          passwordHash: '$2b$10$qLffeSaE7T7UaboNoZjGl.XiPJGiqDFjWcJf.Bp2BkeBw7AaGO.xa',
        },
      ],
      skipDuplicates: true,
    });
    const userIdByEmail = new Map(
      (await tx.user.findMany()).map((u) => [u.email, u.id]),
    );

    // ---------- Memberships (mixtas a propósito, ver comentario de arriba) ----------
    // admin@portalipc.com no necesita membership propia -- superadmin actúa
    // como admin implícito de cualquier proyecto (decisión confirmada, ver
    // ProjectsService#findMine).
    await tx.projectMembership.createMany({
      data: [
        { projectId: precios.id, userId: userIdByEmail.get('monitor@portalipc.com')!, roles: ['monitor'] },
        { projectId: precios.id, userId: userIdByEmail.get('juan@portalipc.com')!, roles: ['student'] },
        { projectId: precios.id, userId: userIdByEmail.get('carlos@portalipc.com')!, roles: ['student'] },
        { projectId: precios.id, userId: userIdByEmail.get('maria@portalipc.com')!, roles: ['student'] },
        { projectId: rally.id, userId: userIdByEmail.get('maria@portalipc.com')!, roles: ['student'] },
      ],
      skipDuplicates: true,
    });

    // ---------- Encuesta de Precios: campos de estudio + variables ----------
    await tx.studyField.createMany({
      data: [
        { name: 'Alimentos', projectId: precios.id },
        { name: 'Bebidas', projectId: precios.id },
        { name: 'Productos de Limpieza', projectId: precios.id },
        { name: 'Productos de Cuidado Personal', projectId: precios.id },
        { name: 'Lácteos', projectId: precios.id },
        { name: 'Percepción y Contexto del Relevamiento', projectId: precios.id },
      ],
      skipDuplicates: true,
    });
    const preciosFields = await tx.studyField.findMany({ where: { projectId: precios.id } });
    const preciosFieldIdByName = new Map(preciosFields.map((f) => [f.name, f.id]));
    const perceptionFieldId = preciosFieldIdByName.get('Percepción y Contexto del Relevamiento');

    await tx.variable.createMany({
      data: [
        { name: 'Arroz', unit: '1 kg', studyFieldId: preciosFieldIdByName.get('Alimentos') },
        { name: 'Frijoles', unit: '1 kg', studyFieldId: preciosFieldIdByName.get('Alimentos') },
        { name: 'Aceite', unit: '1 L', studyFieldId: preciosFieldIdByName.get('Alimentos') },
        { name: 'Azúcar', unit: '1 kg', studyFieldId: preciosFieldIdByName.get('Alimentos') },
        { name: 'Pan', unit: '500 g', studyFieldId: preciosFieldIdByName.get('Alimentos') },
        { name: 'Leche', unit: '1 L', studyFieldId: preciosFieldIdByName.get('Lácteos') },
        { name: 'Queso', unit: '500 g', studyFieldId: preciosFieldIdByName.get('Lácteos') },
        { name: 'Yogurt', unit: '1 L', studyFieldId: preciosFieldIdByName.get('Lácteos') },
        { name: 'Coca Cola', unit: '2 L', studyFieldId: preciosFieldIdByName.get('Bebidas') },
        { name: 'Agua', unit: '1.5 L', studyFieldId: preciosFieldIdByName.get('Bebidas') },
        { name: 'Jugo', unit: '1 L', studyFieldId: preciosFieldIdByName.get('Bebidas') },
        { name: 'Detergente', unit: '1 kg', studyFieldId: preciosFieldIdByName.get('Productos de Limpieza') },
        { name: 'Jabón', unit: '1 unidad', studyFieldId: preciosFieldIdByName.get('Productos de Limpieza') },
        { name: 'Champú', unit: '400 ml', studyFieldId: preciosFieldIdByName.get('Productos de Cuidado Personal') },
        { name: 'Pasta Dental', unit: '1 unidad', studyFieldId: preciosFieldIdByName.get('Productos de Cuidado Personal') },
      ].map((v) => ({ ...v, dataType: 'numeric', config: { isCurrency: true } })),
      skipDuplicates: true,
    });

    // StudyField de demo para mostrar los otros 3 dataTypes (categórico,
    // booleano, texto) además del numérico-moneda de arriba.
    await tx.variable.createMany({
      data: [
        {
          name: 'Temperatura ambiente',
          unit: '°C',
          dataType: 'numeric',
          config: { isCurrency: false, min: -10, max: 50, decimals: 1 },
          studyFieldId: perceptionFieldId,
        },
        {
          name: 'Nivel de afluencia percibido',
          dataType: 'categorical',
          config: { options: ['Bajo', 'Medio', 'Alto'] },
          studyFieldId: perceptionFieldId,
        },
        {
          name: '¿El local tenía cartel de precios visible?',
          dataType: 'boolean',
          studyFieldId: perceptionFieldId,
        },
        {
          name: 'Observaciones adicionales',
          dataType: 'text',
          config: { maxLength: 500 },
          studyFieldId: perceptionFieldId,
        },
      ],
      skipDuplicates: true,
    });

    await tx.observationUnit.createMany({
      data: [
        { name: 'Supermercado Central', address: 'Av. Principal 123', projectId: precios.id },
        { name: 'Tienda La Economía', address: 'Calle 5 # 45-67', projectId: precios.id },
        { name: 'Minimarket San José', address: 'Carrera 10 # 20-30', projectId: precios.id },
        { name: 'Supermercado Express', address: 'Av. Comercial 456', projectId: precios.id },
      ],
      skipDuplicates: true,
    });

    await tx.period.createMany({
      data: [
        { name: 'Enero 2025', month: 1, year: 2025, startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31'), status: 'Closed', projectId: precios.id },
        { name: 'Febrero 2025', month: 2, year: 2025, startDate: new Date('2025-02-01'), endDate: new Date('2025-02-28'), status: 'Closed', projectId: precios.id },
        { name: 'Marzo 2025', month: 3, year: 2025, startDate: new Date('2025-03-01'), endDate: new Date('2025-03-31'), status: 'Closed', projectId: precios.id },
        { name: 'Octubre 2025', month: 10, year: 2025, startDate: new Date('2025-10-01'), endDate: new Date('2025-10-31'), status: 'Open', projectId: precios.id },
      ],
      skipDuplicates: true,
    });

    // ---------- Encuesta del Rally: proyecto secundario, a menor escala ----------
    await tx.studyField.create({
      data: { name: 'Percepción de Seguridad', projectId: rally.id },
    });
    const securityField = await tx.studyField.findFirstOrThrow({
      where: { name: 'Percepción de Seguridad', projectId: rally.id },
    });

    await tx.variable.createMany({
      data: [
        {
          name: 'Nivel de seguridad percibido',
          dataType: 'categorical',
          config: { options: ['Bajo', 'Medio', 'Alto'] },
          studyFieldId: securityField.id,
        },
        {
          name: 'Cantidad de puestos de control',
          unit: 'unidades',
          dataType: 'numeric',
          config: { isCurrency: false },
          studyFieldId: securityField.id,
        },
      ],
      skipDuplicates: true,
    });

    await tx.observationUnit.createMany({
      data: [
        { name: 'Stand Rally Norte', address: 'Km 5', projectId: rally.id },
        { name: 'Stand Rally Sur', address: 'Km 12', projectId: rally.id },
      ],
      skipDuplicates: true,
    });

    await tx.period.create({
      data: { name: 'Octubre 2025', month: 10, year: 2025, startDate: new Date('2025-10-01'), endDate: new Date('2025-10-31'), status: 'Open', projectId: rally.id },
    });

    // ---------- Asignaciones (por proyecto, vía las unidades de cada uno) ----------
    const preciosStudents = ['juan@portalipc.com', 'maria@portalipc.com', 'carlos@portalipc.com']
      .map((email) => userIdByEmail.get(email)!);
    const preciosUnits = await tx.observationUnit.findMany({ where: { projectId: precios.id } });
    await tx.observationUnitAssignment.createMany({
      data: preciosStudents.flatMap((userId) =>
        preciosUnits.map((unit) => ({ userId, observationUnitId: unit.id })),
      ),
      skipDuplicates: true,
    });

    // Solo María es miembro de Rally -- es la única con tareas ahí, a
    // propósito (así el selector de proyecto le muestra tareas distintas
    // según el proyecto activo).
    const rallyUnits = await tx.observationUnit.findMany({ where: { projectId: rally.id } });
    await tx.observationUnitAssignment.createMany({
      data: rallyUnits.map((unit) => ({
        userId: userIdByEmail.get('maria@portalipc.com')!,
        observationUnitId: unit.id,
      })),
      skipDuplicates: true,
    });
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

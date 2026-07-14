import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Period } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { toObservationValueFields } from '../common/validation/variable-value';
import type {
  CreatePeriodDto,
  UpdatePeriodDto,
  UpdateUserDto,
} from './dto/admin.schema';

export interface ObservationRow {
  id: number;
  createdAt: Date;
  numericValue: Prisma.Decimal | null;
  textValue: string | null;
  booleanValue: boolean | null;
  choiceValue: string | null;
  dataType: string;
  isCurrency: boolean;
  periodName: string;
  variableName: string;
  studyFieldName: string;
  userName: string;
  observationUnitName: string;
  isOutlier: boolean;
}

export interface VariableHistoryRow {
  name: string;
  avgValue: Prisma.Decimal | null;
}

export interface VariableDistributionEntry {
  periodName: string;
  counts: Record<string, number>;
}

// Port de admin.service.ts pre-rename (Fase H: Category/Product/Commerce/
// Price -> StudyField/Variable/ObservationUnit/Observation). Las consultas
// de observations/variable-history usan $queryRaw (en vez del query builder
// de Prisma) porque dependen de STDDEV/AVG de Postgres, igual que el
// original -- ahora corren nativas sobre `numeric_value`, que queda
// numeric-only automáticamente porque las filas no numéricas tienen esa
// columna en NULL (que AVG/STDDEV ya ignoran).
//
// Fase R: scoped por proyecto. Se prefirió NO denormalizar projectId en
// Observation/DraftObservation (ver plan) -- las queries raw ya hacen JOIN
// periods/variables, así que un `AND p.project_id = $1` extra no cuesta
// nada estructuralmente. Cada método valida ("chequeo IDOR") que las
// entidades referenciadas por id (period, variable, observation) pertenecen
// efectivamente al projectId recibido, para que un admin del Proyecto A no
// pueda leer/editar datos del Proyecto B adivinando ids.
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Periods

  // Express devolvía columnas snake_case sin transformar, y el frontend lee
  // period.start_date/end_date de ahí. Prisma serializa con los nombres de
  // campo del schema (startDate/endDate), así que hay que remapear a mano.
  private mapPeriod(period: Period) {
    return {
      id: period.id,
      name: period.name,
      month: period.month,
      year: period.year,
      start_date: period.startDate,
      end_date: period.endDate,
      status: period.status,
      created_at: period.createdAt,
    };
  }

  async getPeriods(projectId: number) {
    const periods = await this.prisma.period.findMany({
      where: { projectId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return periods.map((p) => this.mapPeriod(p));
  }

  async createPeriod({
    name,
    month,
    year,
    start_date,
    end_date,
    projectId,
  }: CreatePeriodDto) {
    const existingPeriod = await this.prisma.period.findFirst({
      where: { month, year, projectId },
      select: { id: true },
    });

    if (existingPeriod) {
      throw new ConflictException(
        `Ya existe un período de recolección para ${name} en este proyecto.`,
      );
    }

    const period = await this.prisma.period.create({
      data: {
        name,
        month,
        year,
        startDate: start_date,
        endDate: end_date,
        status: 'Scheduled',
        projectId,
      },
    });
    return this.mapPeriod(period);
  }

  private async assertPeriodInProject(id: number, projectId: number) {
    const period = await this.prisma.period.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!period || period.projectId !== projectId) {
      throw new NotFoundException('Período no encontrado');
    }
  }

  async updatePeriod(
    id: number,
    { start_date, end_date, projectId }: UpdatePeriodDto,
  ) {
    await this.assertPeriodInProject(id, projectId);

    const period = await this.prisma.period.update({
      where: { id },
      data: { startDate: start_date, endDate: end_date },
    });
    return this.mapPeriod(period);
  }

  async updatePeriodStatus(id: number, status: string, projectId: number) {
    await this.assertPeriodInProject(id, projectId);

    if (status === 'Open') {
      const openPeriod = await this.prisma.period.findFirst({
        where: { status: 'Open', projectId, id: { not: id } },
        select: { id: true },
      });

      if (openPeriod) {
        throw new ConflictException(
          'Ya existe otro período abierto en este proyecto. Ciérrelo antes de abrir uno nuevo.',
        );
      }
    }

    const period = await this.prisma.period.update({
      where: { id },
      data: { status },
    });
    return this.mapPeriod(period);
  }

  // Analysis

  // Restringido a variables numéricas Y de moneda (config.isCurrency) --
  // sumar/costear una lectura de temperatura junto a un precio no tiene
  // sentido. Variables numéricas no-monetarias, categóricas, booleanas y de
  // texto quedan fuera de este análisis "costo de canasta" (ver
  // getVariableDistribution para categóricas/booleanas).
  async getAnalysis(projectId: number, periodAId: number, periodBId: number) {
    await this.assertPeriodInProject(periodAId, projectId);
    await this.assertPeriodInProject(periodBId, projectId);

    const allVariables = await this.prisma.variable.findMany({
      where: { dataType: 'numeric', studyField: { projectId } },
      select: { id: true, name: true, studyFieldId: true, config: true },
    });
    const currencyVariables = allVariables.filter(
      (v) => (v.config as { isCurrency?: boolean } | null)?.isCurrency === true,
    );
    const currencyVariableIds = new Set(currencyVariables.map((v) => v.id));

    const [observationsA, observationsB, allStudyFields] = await Promise.all([
      this.prisma.observation.findMany({
        where: {
          periodId: periodAId,
          variableId: { in: [...currencyVariableIds] },
        },
        select: { variableId: true, numericValue: true },
      }),
      this.prisma.observation.findMany({
        where: {
          periodId: periodBId,
          variableId: { in: [...currencyVariableIds] },
        },
        select: { variableId: true, numericValue: true },
      }),
      this.prisma.studyField.findMany({
        where: { projectId },
        select: { id: true, name: true },
      }),
    ]);

    const calculateAverages = (
      rows: {
        variableId: number | null;
        numericValue: Prisma.Decimal | null;
      }[],
    ) => {
      const valueMap = new Map<number, number[]>();
      rows.forEach((row) => {
        if (row.variableId == null || row.numericValue == null) return;
        if (!valueMap.has(row.variableId)) valueMap.set(row.variableId, []);
        const value = Number(row.numericValue);
        if (!isNaN(value)) {
          valueMap.get(row.variableId)!.push(value);
        }
      });

      const avgMap = new Map<number, number>();
      valueMap.forEach((values, variableId) => {
        if (values.length > 0) {
          // Primera pasada: media y desvío estándar
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev =
            values.length > 1
              ? Math.sqrt(
                  values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
                    values.length,
                )
              : 0;

          // Segunda pasada: descarta outliers con la regla de 2-sigma (igual que getObservations)
          const filtered =
            stdDev > 0
              ? values.filter((v) => Math.abs(v - mean) <= 2 * stdDev)
              : values;

          if (filtered.length > 0) {
            const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
            avgMap.set(variableId, avg);
          }
        }
      });
      return avgMap;
    };

    const avgValuesA = calculateAverages(observationsA);
    const avgValuesB = calculateAverages(observationsB);

    let totalCostA = 0;
    let totalCostB = 0;

    const calculateVariation = (costA: number, costB: number) => {
      if (costB > 0) {
        return ((costA - costB) / costB) * 100;
      }
      return costA > 0 ? 100 : 0;
    };

    const studyFieldAnalysis = allStudyFields.map((field) => {
      const fieldVariables = currencyVariables.filter(
        (v) => v.studyFieldId === field.id,
      );
      let fieldCostA = 0;
      let fieldCostB = 0;

      const variableAnalysis = fieldVariables.map((v) => {
        const valueA = avgValuesA.get(v.id) || 0;
        const valueB = avgValuesB.get(v.id) || 0;
        fieldCostA += valueA;
        fieldCostB += valueB;
        return {
          id: v.id,
          name: v.name,
          valueA,
          valueB,
          variation: calculateVariation(valueA, valueB),
        };
      });

      totalCostA += fieldCostA;
      totalCostB += fieldCostB;

      return {
        id: field.id,
        name: field.name,
        costA: fieldCostA,
        costB: fieldCostB,
        variation: calculateVariation(fieldCostA, fieldCostB),
        variables: variableAnalysis,
      };
    });

    const totalVariation = calculateVariation(totalCostA, totalCostB);

    return {
      studyFieldAnalysis,
      totalCostA,
      totalCostB,
      totalVariation,
    };
  }

  getVariableHistory(
    projectId: number,
    variableId?: number,
    studyFieldId?: number,
  ) {
    if (variableId != null) {
      return this.prisma.$queryRaw<VariableHistoryRow[]>`
        SELECT p.name, AVG(o.numeric_value) as "avgValue"
        FROM observations o
        JOIN periods p ON o.period_id = p.id
        WHERE o.variable_id = ${variableId} AND p.project_id = ${projectId}
        GROUP BY p.id, p.name, p.year, p.month
        ORDER BY p.year, p.month;
      `;
    }

    if (studyFieldId != null) {
      return this.prisma.$queryRaw<VariableHistoryRow[]>`
        SELECT p.name, AVG(o.numeric_value) as "avgValue"
        FROM observations o
        JOIN variables v ON o.variable_id = v.id
        JOIN periods p ON o.period_id = p.id
        WHERE v.study_field_id = ${studyFieldId} AND p.project_id = ${projectId}
        GROUP BY p.id, p.name, p.year, p.month
        ORDER BY p.year, p.month;
      `;
    }

    throw new BadRequestException('Se requiere variableId o studyFieldId');
  }

  // Distribución de frecuencias por período -- equivalente de
  // getVariableHistory pero para variables categóricas/booleanas, donde un
  // AVG no tiene sentido (ver plan de Fase I).
  async getVariableDistribution(
    projectId: number,
    variableId: number,
  ): Promise<VariableDistributionEntry[]> {
    const variable = await this.prisma.variable.findUnique({
      where: { id: variableId },
      include: { studyField: { select: { projectId: true } } },
    });

    if (!variable || variable.studyField?.projectId !== projectId) {
      throw new NotFoundException('Variable no encontrada');
    }
    if (
      variable.dataType !== 'categorical' &&
      variable.dataType !== 'boolean'
    ) {
      throw new BadRequestException(
        'La distribución solo aplica a variables categóricas o booleanas',
      );
    }

    const rows = await this.prisma.$queryRaw<
      { periodName: string; value: string; count: bigint }[]
    >`
      SELECT
        p.name AS "periodName",
        COALESCE(o.choice_value, o.boolean_value::text) AS "value",
        COUNT(*) AS "count"
      FROM observations o
      JOIN periods p ON o.period_id = p.id
      WHERE o.variable_id = ${variableId}
        AND p.project_id = ${projectId}
        AND (o.choice_value IS NOT NULL OR o.boolean_value IS NOT NULL)
      GROUP BY p.id, p.name, p.year, p.month, COALESCE(o.choice_value, o.boolean_value::text)
      ORDER BY p.year, p.month;
    `;

    const byPeriod = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!byPeriod.has(row.periodName)) byPeriod.set(row.periodName, {});
      byPeriod.get(row.periodName)![row.value] = Number(row.count);
    }

    return Array.from(byPeriod.entries()).map(([periodName, counts]) => ({
      periodName,
      counts,
    }));
  }

  // Observations

  getObservations(filters: {
    projectId: number;
    periodId?: number;
    studyFieldId?: number;
    variableId?: number;
    userId?: number;
    observationUnitId?: number;
    showOutliersOnly?: boolean;
  }) {
    // projectId es obligatorio y siempre se aplica -- a diferencia del
    // resto de `conditions`, que son filtros opcionales que el caller puede
    // combinar libremente.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`pd.project_id = ${filters.projectId}`,
    ];

    if (filters.periodId != null) {
      conditions.push(Prisma.sql`o.period_id = ${filters.periodId}`);
    }
    if (filters.studyFieldId != null) {
      conditions.push(Prisma.sql`v.study_field_id = ${filters.studyFieldId}`);
    }
    if (filters.variableId != null) {
      conditions.push(Prisma.sql`o.variable_id = ${filters.variableId}`);
    }
    if (filters.userId != null) {
      conditions.push(Prisma.sql`o.user_id = ${filters.userId}`);
    }
    if (filters.observationUnitId != null) {
      conditions.push(
        Prisma.sql`o.observation_unit_id = ${filters.observationUnitId}`,
      );
    }
    if (filters.showOutliersOnly) {
      conditions.push(
        Prisma.sql`(o.numeric_value IS NOT NULL AND os.std_dev > 0 AND ABS(o.numeric_value - os.avg_value) > (2 * os.std_dev))`,
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const query = Prisma.sql`
      WITH observation_stats AS (
          SELECT period_id, variable_id, AVG(numeric_value) as avg_value, STDDEV(numeric_value) as std_dev
          FROM observations
          WHERE numeric_value IS NOT NULL
          GROUP BY period_id, variable_id
      )
      SELECT
          o.id, o.created_at AS "createdAt",
          o.numeric_value AS "numericValue", o.text_value AS "textValue",
          o.boolean_value AS "booleanValue", o.choice_value AS "choiceValue",
          v.data_type AS "dataType",
          COALESCE((v.config->>'isCurrency')::boolean, false) AS "isCurrency",
          pd.name AS "periodName", v.name AS "variableName",
          sf.name AS "studyFieldName",
          u.name AS "userName", ou.name AS "observationUnitName",
          CASE
              WHEN o.numeric_value IS NOT NULL AND os.std_dev > 0 AND ABS(o.numeric_value - os.avg_value) > (2 * os.std_dev)
              THEN TRUE ELSE FALSE
          END AS "isOutlier"
      FROM observations o
      JOIN periods pd ON o.period_id = pd.id
      JOIN variables v ON o.variable_id = v.id
      JOIN study_fields sf ON v.study_field_id = sf.id
      JOIN users u ON o.user_id = u.id
      JOIN observation_units ou ON o.observation_unit_id = ou.id
      LEFT JOIN observation_stats os ON o.period_id = os.period_id AND o.variable_id = os.variable_id
      ${whereClause}
      ORDER BY o.created_at DESC;
    `;

    return this.prisma.$queryRaw<ObservationRow[]>(query);
  }

  async updateObservation(
    id: number,
    rawValue: number | string | boolean,
    projectId: number,
  ) {
    const observation = await this.prisma.observation.findUnique({
      where: { id },
      select: {
        variableId: true,
        period: { select: { projectId: true } },
      },
    });
    if (
      !observation ||
      observation.variableId == null ||
      observation.period?.projectId !== projectId
    ) {
      throw new NotFoundException('Observación no encontrada');
    }

    const variable = await this.prisma.variable.findUnique({
      where: { id: observation.variableId },
    });
    if (!variable) {
      throw new NotFoundException('Variable no encontrada');
    }

    const valueFields = toObservationValueFields(variable, rawValue);

    return this.prisma.observation.update({
      where: { id },
      data: valueFields,
    });
  }

  async deleteObservation(id: number, projectId: number) {
    const observation = await this.prisma.observation.findUnique({
      where: { id },
      select: { period: { select: { projectId: true } } },
    });
    if (!observation || observation.period?.projectId !== projectId) {
      throw new NotFoundException('Observación no encontrada');
    }

    await this.prisma.observation.delete({ where: { id } });
  }

  // Users

  // Superadmin-only: lista todos los usuarios de la plataforma, no scoped
  // por proyecto (ver PlatformDashboard, Fase X).
  getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, roles: true },
      orderBy: { name: 'asc' },
    });
  }

  // Un admin de proyecto crea el User (con roles globales vacíos -- ya no
  // se otorgan roles admin/monitor/student a nivel global) y queda
  // adjuntado a su proyecto con los roles de proyecto pedidos, todo en una
  // transacción.
  async createUser({
    name,
    email,
    password,
    projectId,
    roles,
  }: {
    name: string;
    email: string;
    password: string;
    projectId: number;
    roles: string[];
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, roles: [] },
        select: { id: true, name: true, email: true, roles: true },
      });

      await tx.projectMembership.create({
        data: { projectId, userId: created.id, roles },
      });

      return created;
    });

    return { ...user, projectRoles: roles };
  }

  // Un admin de proyecto solo puede editar usuarios que sean miembros de SU
  // proyecto -- evita que un admin del Proyecto A cambie el email/password
  // de un usuario exclusivo del Proyecto B.
  private async assertUserInProject(userId: number, projectId: number) {
    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true },
    });
    if (!membership) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async updateUser(userId: number, { name, email, projectId }: UpdateUserDto) {
    await this.assertUserInProject(userId, projectId);

    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException('Ya existe otro usuario con ese email');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, name: true, email: true, roles: true },
    });
  }

  async updateUserPassword(
    userId: number,
    newPassword: string,
    projectId: number,
  ) {
    await this.assertUserInProject(userId, projectId);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    });

    return { success: true };
  }

  // Superadmin-only: borra el User global, cascadeando en TODOS los
  // proyectos de los que es miembro -- demasiado destructivo para dejarlo
  // en manos de un admin de un solo proyecto.
  deleteUser(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const observationCount = await tx.observation.count({
        where: { userId },
      });

      if (observationCount > 0) {
        throw new ConflictException(
          `No se puede eliminar el usuario porque tiene ${observationCount} observación(es) registrada(s). Los datos históricos deben preservarse.`,
        );
      }

      // Los borradores y memberships sí se pueden eliminar
      await tx.draftObservation.deleteMany({ where: { userId } });
      await tx.observationUnitAssignment.deleteMany({ where: { userId } });
      await tx.projectMembership.deleteMany({ where: { userId } });

      try {
        await tx.user.delete({ where: { id: userId } });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException('Usuario no encontrado');
        }
        throw error;
      }

      return { success: true };
    });
  }

  // Superadmin-only: `roles` acá solo puede ser ['superadmin'] o [] (ver
  // updateUserRolesSchema) -- ya no otorga admin/monitor/student, eso vive
  // en ProjectMembership.
  async updateUserRoles(userId: number, roles: string[]) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { roles },
        select: { id: true, name: true, email: true, roles: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }
}

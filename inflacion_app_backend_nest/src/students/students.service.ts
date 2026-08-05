import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  pickObservationValue,
  toObservationValueFields,
} from '../common/validation/variable-value';
import type { SaveDraftDto, SubmitObservationsDto } from './dto/student.schema';

type TaskStatus = 'Pendiente' | 'Completado' | 'En Proceso';

// Fase H: renombrado de dominio (Product -> Variable, Commerce ->
// ObservationUnit, Price -> Observation) + unificación de saveDraft/
// submitPrices en un solo envelope multi-tipo (port de students.service.ts
// pre-rename).
//
// Fase S: scoped por proyecto. `projectId` en saveDraft/submitObservations
// viene SIEMPRE de request.activeProjectId (CollectionPeriodGuard, derivado
// server-side del observationUnitId) -- nunca de un valor declarado por el
// cliente. Además, las Variables referenciadas en `values` se resuelven
// filtrando por `studyField.projectId`, así que un variableId de otro
// proyecto simplemente no matchea (mismo principio ya usado para el
// dataType de una Variable en variable-value.ts: no confiar en lo que el
// cliente declara, resolverlo server-side contra la entidad real).
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentTasks(userId: number, projectId: number) {
    const [variables, studyFields, assignedObservationUnits] =
      await Promise.all([
        this.prisma.variable.findMany({
          where: { studyField: { projectId } },
          select: {
            id: true,
            name: true,
            unit: true,
            dataType: true,
            config: true,
            studyFieldId: true,
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.studyField.findMany({
          where: { projectId },
          orderBy: { name: 'asc' },
        }),
        this.prisma.observationUnitAssignment.findMany({
          where: { userId, observationUnit: { projectId } },
          select: {
            observationUnit: {
              select: { id: true, name: true, address: true },
            },
          },
          orderBy: { observationUnit: { name: 'asc' } },
        }),
      ]);

    return {
      variables,
      studyFields,
      assignedObservationUnits: assignedObservationUnits.map(
        (a) => a.observationUnit,
      ),
    };
  }

  async getStudentDashboard(userId: number, projectId: number) {
    const periods = await this.prisma.period.findMany({
      where: { projectId },
      select: { id: true, name: true, status: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const [drafts, observations, assignedObservationUnits] = await Promise.all([
      this.prisma.draftObservation.findMany({
        where: { userId, period: { projectId } },
        select: {
          variableId: true,
          observationUnitId: true,
          periodId: true,
          numericValue: true,
          textValue: true,
          booleanValue: true,
          choiceValue: true,
          isUnavailable: true,
          observationUnit: { select: { name: true } },
        },
      }),
      this.prisma.observation.findMany({
        where: { userId, period: { projectId } },
        select: {
          variableId: true,
          observationUnitId: true,
          periodId: true,
          numericValue: true,
          textValue: true,
          booleanValue: true,
          choiceValue: true,
          isUnavailable: true,
          observationUnit: { select: { name: true } },
        },
      }),
      this.prisma.observationUnitAssignment.findMany({
        where: { userId, observationUnit: { projectId } },
        select: { observationUnit: { select: { id: true, name: true } } },
        orderBy: { observationUnit: { name: 'asc' } },
      }),
    ]);

    const assignedObservationUnitsList = assignedObservationUnits.map(
      (a) => a.observationUnit,
    );

    return periods.map((period) => {
      const unitsMap = new Map<number, { id: number; name: string }>();

      observations
        .filter((o) => o.periodId === period.id)
        .forEach((o) => {
          if (
            o.observationUnitId != null &&
            !unitsMap.has(o.observationUnitId)
          ) {
            unitsMap.set(o.observationUnitId, {
              id: o.observationUnitId,
              name: o.observationUnit!.name,
            });
          }
        });

      drafts
        .filter((d) => d.periodId === period.id)
        .forEach((d) => {
          if (
            d.observationUnitId != null &&
            !unitsMap.has(d.observationUnitId)
          ) {
            unitsMap.set(d.observationUnitId, {
              id: d.observationUnitId,
              name: d.observationUnit!.name,
            });
          }
        });

      // El período abierto es el único donde se puede escribir (ver
      // CollectionPeriodGuard), así que ahí las tareas SON las asignaciones
      // vigentes, unidas a las unidades que ya tienen datos -- si una
      // asignación se revoca a mitad de período, lo ya cargado no debe
      // desaparecer del dashboard. Antes las asignaciones eran un fallback
      // que sólo aplicaba con `unitsMap` vacío, así que al guardar el primer
      // borrador las demás unidades asignadas desaparecían de la lista.
      //
      // En períodos cerrados se mantiene la foto histórica (sólo unidades con
      // registros), con las asignaciones actuales como fallback cuando el
      // período no tiene ningún dato.
      if (period.status === 'Open') {
        assignedObservationUnitsList.forEach((unit) => {
          if (!unitsMap.has(unit.id)) unitsMap.set(unit.id, unit);
        });
      }

      let unitsForPeriod = Array.from(unitsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      if (unitsForPeriod.length === 0) {
        unitsForPeriod = assignedObservationUnitsList;
      }

      const tasks = unitsForPeriod.map((observationUnit) => {
        const submittedForPeriod = observations.filter(
          (o) =>
            o.periodId === period.id &&
            o.observationUnitId === observationUnit.id,
        );
        const draftsForPeriod = drafts.filter(
          (d) =>
            d.periodId === period.id &&
            d.observationUnitId === observationUnit.id,
        );

        let status: TaskStatus = 'Pendiente';
        if (submittedForPeriod.length > 0) {
          status = 'Completado';
        } else if (draftsForPeriod.length > 0) {
          status = 'En Proceso';
        }

        // Fase AD: las variables marcadas "no disponible" viajan aparte y no
        // dentro de los mapas de valores. Sus cuatro columnas de valor son
        // NULL, así que en el mapa serían indistinguibles de una variable sin
        // cargar -- que es exactamente la ambigüedad que esta fase elimina.
        // La fuente es la misma que la del status: borradores si todavía no
        // se envió, observaciones si ya se envió.
        const unavailableSource =
          submittedForPeriod.length > 0 ? submittedForPeriod : draftsForPeriod;

        return {
          observationUnitId: observationUnit.id,
          observationUnitName: observationUnit.name,
          status,
          unavailableVariableIds: unavailableSource
            .filter((row) => row.isUnavailable && row.variableId != null)
            .map((row) => row.variableId!),
          draftValues: draftsForPeriod.reduce<Record<string, unknown>>(
            (acc, d) => {
              acc[d.variableId!] = pickObservationValue(d);
              return acc;
            },
            {},
          ),
          submittedValues: submittedForPeriod.reduce<Record<string, unknown>>(
            (acc, o) => {
              acc[o.variableId!] = pickObservationValue(o);
              return acc;
            },
            {},
          ),
        };
      });

      return {
        periodId: period.id,
        periodName: period.name,
        status: period.status,
        tasks,
      };
    });
  }

  async saveDraft(
    userId: number,
    observationUnitId: number,
    periodId: number,
    projectId: number,
    values: SaveDraftDto['values'],
  ) {
    // Fase AD: una entrada marcada como no disponible se guarda aunque no
    // traiga valor -- es justamente la fila que sostiene la marca. El resto
    // sigue descartándose por vacía.
    const entries = (values ?? []).filter(
      (v) => v.isUnavailable === true || (v.value != null && v.value !== ''),
    );

    const variables =
      entries.length > 0
        ? await this.prisma.variable.findMany({
            where: {
              id: { in: entries.map((e) => e.variableId) },
              studyField: { projectId },
            },
          })
        : [];
    const variablesById = new Map(variables.map((v) => [v.id, v]));

    const rows = entries.map((entry) => {
      const variable = variablesById.get(entry.variableId);
      if (!variable) {
        return null;
      }
      return {
        userId,
        variableId: entry.variableId,
        observationUnitId,
        periodId,
        ...toObservationValueFields(variable, entry.value, entry.isUnavailable),
      };
    });
    const validRows = rows.filter((r): r is NonNullable<typeof r> => r != null);

    await this.prisma.$transaction(async (tx) => {
      await tx.draftObservation.deleteMany({
        where: { userId, observationUnitId, periodId },
      });

      if (validRows.length > 0) {
        await tx.draftObservation.createMany({ data: validRows });
      }
    });
  }

  async submitObservations(
    userId: number,
    periodId: number,
    observationUnitId: number,
    projectId: number,
    values: SubmitObservationsDto['values'],
  ) {
    const assignment = await this.prisma.observationUnitAssignment.findFirst({
      where: { userId, observationUnitId },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'No estás asignado a esta unidad de observación',
      );
    }

    const variables = await this.prisma.variable.findMany({
      where: {
        id: { in: values.map((v) => v.variableId) },
        studyField: { projectId },
      },
    });
    const variablesById = new Map(variables.map((v) => [v.id, v]));

    const rows = values.map((entry) => {
      const variable = variablesById.get(entry.variableId);
      if (!variable) {
        throw new ForbiddenException(
          `Variable ${entry.variableId} no encontrada`,
        );
      }
      return {
        userId,
        variableId: entry.variableId,
        observationUnitId,
        periodId,
        ...toObservationValueFields(variable, entry.value, entry.isUnavailable),
      };
    });

    await this.prisma.$transaction(async (tx) => {
      // Elimina observaciones existentes para este usuario/unidad/período
      // (previene duplicados) antes de insertar las nuevas.
      await tx.observation.deleteMany({
        where: { userId, observationUnitId, periodId },
      });

      for (const row of rows) {
        await tx.observation.create({ data: row });
      }

      // Elimina borradores después del envío exitoso
      await tx.draftObservation.deleteMany({
        where: { userId, observationUnitId, periodId },
      });
    });
  }
}

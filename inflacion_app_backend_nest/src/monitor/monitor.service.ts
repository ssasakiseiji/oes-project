import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pickObservationValue } from '../common/validation/variable-value';

type TaskStatus = 'Completado' | 'En Proceso' | 'Pendiente' | 'No completado';
type CompletionLevel = 'bajo' | 'medio' | 'alto' | null;

// Fase H: renombrado de dominio (port 1:1 de monitor.service.ts pre-rename)
// -- la lógica de progreso ya era agnóstica al tipo de valor (cuenta
// observaciones enviadas, no las suma ni promedia), así que el único
// cambio real acá es de nombres.
//
// Fase S: scoped por proyecto. Antes de esto, este método no tenía NINGÚN
// scoping más allá de "sos monitor" -- traía todos los estudiantes,
// observaciones, unidades, etc. de la base entera. Ahora todo se filtra por
// projectId (directo en period/observationUnit/variable, vía
// ProjectMembership en el filtro de estudiantes, y vía la relación
// observationUnit en assignments/observations/draftObservations).
@Injectable()
export class MonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonitorData(projectId: number) {
    const [
      periods,
      students,
      totalVariables,
      currentAssignments,
      allObservations,
      allDraftObservations,
      allObservationUnits,
    ] = await Promise.all([
      this.prisma.period.findMany({
        where: { projectId },
        select: { id: true, name: true, status: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.user.findMany({
        where: {
          projectMemberships: {
            some: { projectId, roles: { has: 'student' } },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.variable.count({ where: { studyField: { projectId } } }),
      this.prisma.observationUnitAssignment.findMany({
        where: { observationUnit: { projectId } },
        select: { userId: true, observationUnitId: true },
      }),
      this.prisma.observation.findMany({
        where: { observationUnit: { projectId } },
        select: {
          userId: true,
          observationUnitId: true,
          periodId: true,
          variableId: true,
          numericValue: true,
          textValue: true,
          booleanValue: true,
          choiceValue: true,
        },
      }),
      this.prisma.draftObservation.findMany({
        where: { observationUnit: { projectId } },
        select: {
          userId: true,
          observationUnitId: true,
          periodId: true,
          variableId: true,
          numericValue: true,
          textValue: true,
          booleanValue: true,
          choiceValue: true,
        },
      }),
      this.prisma.observationUnit.findMany({
        where: { projectId },
        select: { id: true, name: true },
      }),
    ]);

    const observationUnitsMap = new Map(
      allObservationUnits.map((u) => [u.id, u.name]),
    );

    const monitorDataByPeriod = periods.map((period) => {
      const isCurrentPeriodOpen = period.status === 'Open';

      const studentProgress = students.map((student) => {
        const relevantUnitIds = new Set<number>();

        currentAssignments
          .filter((a) => a.userId === student.id)
          .forEach((a) => relevantUnitIds.add(a.observationUnitId));

        if (!isCurrentPeriodOpen) {
          allObservations
            .filter((o) => o.periodId === period.id && o.userId === student.id)
            .forEach((o) => {
              if (o.observationUnitId != null) {
                relevantUnitIds.add(o.observationUnitId);
              }
            });
        }

        const tasks = Array.from(relevantUnitIds)
          .map((observationUnitId) => {
            const observationUnitName =
              observationUnitsMap.get(observationUnitId) ??
              `Unidad de observación ID ${observationUnitId}`;

            const submitted = allObservations.filter(
              (o) =>
                o.periodId === period.id &&
                o.userId === student.id &&
                o.observationUnitId === observationUnitId,
            );
            const draftsForTask = allDraftObservations.filter(
              (d) =>
                d.periodId === period.id &&
                d.userId === student.id &&
                d.observationUnitId === observationUnitId,
            );

            let status: TaskStatus;
            if (submitted.length > 0) {
              status = 'Completado';
            } else if (isCurrentPeriodOpen) {
              status = draftsForTask.length > 0 ? 'En Proceso' : 'Pendiente';
            } else {
              status = 'No completado';
            }

            const currentProgress = submitted.length;
            const percentage =
              totalVariables > 0 ? (currentProgress / totalVariables) * 100 : 0;
            let completionLevel: CompletionLevel = null;
            if (status === 'Completado') {
              if (percentage < 33) completionLevel = 'bajo';
              else if (percentage <= 66) completionLevel = 'medio';
              else completionLevel = 'alto';
            }

            const submittedValues = submitted.reduce<Record<string, unknown>>(
              (acc, o) => {
                if (o.variableId != null)
                  acc[o.variableId] = pickObservationValue(o);
                return acc;
              },
              {},
            );
            const draftValues = draftsForTask.reduce<Record<string, unknown>>(
              (acc, d) => {
                if (d.variableId != null)
                  acc[d.variableId] = pickObservationValue(d);
                return acc;
              },
              {},
            );

            return {
              observationUnitId,
              observationUnitName,
              status,
              completionLevel,
              progress: { current: currentProgress, total: totalVariables },
              submittedValues,
              draftValues,
            };
          })
          .sort((a, b) =>
            a.observationUnitName.localeCompare(b.observationUnitName),
          );

        return { studentId: student.id, studentName: student.name, tasks };
      });

      return {
        periodId: period.id,
        periodName: period.name,
        status: period.status,
        students: studentProgress.filter((s) => s.tasks.length > 0),
      };
    });

    return monitorDataByPeriod;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TaskStatus = 'Completado' | 'En Proceso' | 'Pendiente' | 'No completado';
type CompletionLevel = 'bajo' | 'medio' | 'alto' | null;

// Port de inflacion_app_backend/services/monitorService.js.
@Injectable()
export class MonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonitorData() {
    const [
      periods,
      students,
      totalProducts,
      currentAssignments,
      allPrices,
      allDraftPrices,
      allCommerces,
    ] = await Promise.all([
      this.prisma.period.findMany({
        select: { id: true, name: true, status: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.user.findMany({
        where: { roles: { has: 'student' } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count(),
      this.prisma.commerceAssignment.findMany({
        select: { userId: true, commerceId: true },
      }),
      this.prisma.price.findMany({
        select: {
          userId: true,
          commerceId: true,
          periodId: true,
          productId: true,
          price: true,
        },
      }),
      // Igual que el original: no se selecciona `price` acá, solo se usa
      // para detectar la existencia de un borrador ("En Proceso").
      this.prisma.draftPrice.findMany({
        select: {
          userId: true,
          commerceId: true,
          periodId: true,
          productId: true,
        },
      }),
      this.prisma.commerce.findMany({ select: { id: true, name: true } }),
    ]);

    const commercesMap = new Map(allCommerces.map((c) => [c.id, c.name]));

    const monitorDataByPeriod = periods.map((period) => {
      const isCurrentPeriodOpen = period.status === 'Open';

      const studentProgress = students.map((student) => {
        const relevantCommerceIds = new Set<number>();

        currentAssignments
          .filter((a) => a.userId === student.id)
          .forEach((a) => relevantCommerceIds.add(a.commerceId));

        if (!isCurrentPeriodOpen) {
          allPrices
            .filter((p) => p.periodId === period.id && p.userId === student.id)
            .forEach((p) => {
              if (p.commerceId != null) relevantCommerceIds.add(p.commerceId);
            });
        }

        const tasks = Array.from(relevantCommerceIds)
          .map((commerceId) => {
            const commerceName =
              commercesMap.get(commerceId) ?? `Comercio ID ${commerceId}`;

            const submittedPrices = allPrices.filter(
              (p) =>
                p.periodId === period.id &&
                p.userId === student.id &&
                p.commerceId === commerceId,
            );
            const draftPricesForTask = allDraftPrices.filter(
              (d) =>
                d.periodId === period.id &&
                d.userId === student.id &&
                d.commerceId === commerceId,
            );

            let status: TaskStatus;
            if (submittedPrices.length > 0) {
              status = 'Completado';
            } else if (isCurrentPeriodOpen) {
              status =
                draftPricesForTask.length > 0 ? 'En Proceso' : 'Pendiente';
            } else {
              status = 'No completado';
            }

            const currentProgress = submittedPrices.length;
            const percentage =
              totalProducts > 0 ? (currentProgress / totalProducts) * 100 : 0;
            let completionLevel: CompletionLevel = null;
            if (status === 'Completado') {
              if (percentage < 33) completionLevel = 'bajo';
              else if (percentage <= 66) completionLevel = 'medio';
              else completionLevel = 'alto';
            }

            const submittedPricesMap = submittedPrices.reduce<
              Record<string, unknown>
            >((acc, p) => {
              if (p.productId != null) acc[p.productId] = p.price;
              return acc;
            }, {});
            const draftPricesMap = draftPricesForTask.reduce<
              Record<string, unknown>
            >((acc, d) => {
              if (d.productId != null) acc[d.productId] = undefined;
              return acc;
            }, {});

            return {
              commerceId,
              commerceName,
              status,
              completionLevel,
              progress: { current: currentProgress, total: totalProducts },
              submittedPrices: submittedPricesMap,
              draftPrices: draftPricesMap,
            };
          })
          .sort((a, b) => a.commerceName.localeCompare(b.commerceName));

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

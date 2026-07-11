import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveDraftDto } from './dto/student.schema';

type TaskStatus = 'Pendiente' | 'Completado' | 'En Proceso';

// Port de inflacion_app_backend/services/studentService.js.
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentTasks(userId: number) {
    const [products, categories, assignedCommerces] = await Promise.all([
      this.prisma.product.findMany({
        select: { id: true, name: true, unit: true, categoryId: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.commerceAssignment.findMany({
        where: { userId },
        select: {
          commerce: { select: { id: true, name: true, address: true } },
        },
        orderBy: { commerce: { name: 'asc' } },
      }),
    ]);

    return {
      products,
      categories,
      assignedCommerces: assignedCommerces.map((a) => a.commerce),
    };
  }

  async getStudentDashboard(userId: number) {
    const periods = await this.prisma.period.findMany({
      select: { id: true, name: true, status: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const [drafts, prices, assignedCommerces] = await Promise.all([
      this.prisma.draftPrice.findMany({
        where: { userId },
        select: {
          productId: true,
          commerceId: true,
          periodId: true,
          price: true,
          commerce: { select: { name: true } },
        },
      }),
      this.prisma.price.findMany({
        where: { userId },
        select: {
          productId: true,
          commerceId: true,
          periodId: true,
          price: true,
          commerce: { select: { name: true } },
        },
      }),
      this.prisma.commerceAssignment.findMany({
        where: { userId },
        select: { commerce: { select: { id: true, name: true } } },
        orderBy: { commerce: { name: 'asc' } },
      }),
    ]);

    const assignedCommercesList = assignedCommerces.map((a) => a.commerce);

    return periods.map((period) => {
      const commercesMap = new Map<number, { id: number; name: string }>();

      prices
        .filter((p) => p.periodId === period.id)
        .forEach((p) => {
          if (p.commerceId != null && !commercesMap.has(p.commerceId)) {
            commercesMap.set(p.commerceId, {
              id: p.commerceId,
              name: p.commerce!.name,
            });
          }
        });

      drafts
        .filter((d) => d.periodId === period.id)
        .forEach((d) => {
          if (d.commerceId != null && !commercesMap.has(d.commerceId)) {
            commercesMap.set(d.commerceId, {
              id: d.commerceId,
              name: d.commerce!.name,
            });
          }
        });

      // Si no hay registros en este período, usar las asignaciones actuales
      let commercesForPeriod = Array.from(commercesMap.values());
      if (commercesForPeriod.length === 0) {
        commercesForPeriod = assignedCommercesList;
      }

      const tasks = commercesForPeriod.map((commerce) => {
        const submittedPricesForPeriod = prices.filter(
          (p) => p.periodId === period.id && p.commerceId === commerce.id,
        );
        const draftPricesForPeriod = drafts.filter(
          (d) => d.periodId === period.id && d.commerceId === commerce.id,
        );

        let status: TaskStatus = 'Pendiente';
        if (submittedPricesForPeriod.length > 0) {
          status = 'Completado';
        } else if (draftPricesForPeriod.length > 0) {
          status = 'En Proceso';
        }

        return {
          commerceId: commerce.id,
          commerceName: commerce.name,
          status,
          draftPrices: draftPricesForPeriod.reduce<Record<string, unknown>>(
            (acc, p) => {
              acc[p.productId!] = p.price;
              return acc;
            },
            {},
          ),
          submittedPrices: submittedPricesForPeriod.reduce<
            Record<string, unknown>
          >((acc, p) => {
            acc[p.productId!] = p.price;
            return acc;
          }, {}),
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
    commerceId: number,
    periodId: number,
    prices: SaveDraftDto['prices'],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.draftPrice.deleteMany({
        where: { userId, commerceId, periodId },
      });

      const priceEntries = Object.entries(prices ?? {}).filter(
        ([, price]) => price != null && price !== '',
      );

      if (priceEntries.length > 0) {
        await tx.draftPrice.createMany({
          data: priceEntries.map(([productId, price]) => ({
            userId,
            productId: parseInt(productId, 10),
            commerceId,
            periodId,
            price: price as number | string,
          })),
        });
      }
    });
  }

  async submitPrices(
    userId: number,
    periodId: number,
    pricesData: { productId: number; commerceId: number; price: number }[],
  ) {
    const commerceId = pricesData.length > 0 ? pricesData[0].commerceId : null;

    await this.prisma.$transaction(async (tx) => {
      // Verificar que el estudiante está asignado a este comercio
      if (commerceId != null) {
        const assignment = await tx.commerceAssignment.findFirst({
          where: { userId, commerceId },
          select: { id: true },
        });
        if (!assignment) {
          throw new ForbiddenException('No estás asignado a este comercio');
        }
      }

      // Eliminar precios existentes para este usuario/comercio/período (previene duplicados)
      if (commerceId != null) {
        await tx.price.deleteMany({
          where: { userId, commerceId, periodId },
        });
      }

      // Insertar nuevos precios
      for (const p of pricesData) {
        await tx.price.create({
          data: {
            price: p.price,
            periodId,
            productId: p.productId,
            userId,
            commerceId: p.commerceId,
          },
        });
      }

      // Eliminar borradores después del envío exitoso
      if (commerceId != null) {
        await tx.draftPrice.deleteMany({
          where: { userId, commerceId, periodId },
        });
      }
    });
  }
}

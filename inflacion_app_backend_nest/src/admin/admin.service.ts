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
import type {
  CreatePeriodDto,
  UpdatePeriodDto,
  UpdateUserDto,
} from './dto/admin.schema';

export interface PriceRow {
  id: number;
  price: Prisma.Decimal;
  createdAt: Date;
  periodName: string;
  productName: string;
  categoryName: string;
  userName: string;
  commerceName: string;
  isOutlier: boolean;
}

export interface HistoricalRow {
  name: string;
  avgPrice: Prisma.Decimal | null;
}

// Port de inflacion_app_backend/services/adminService.js. Las consultas de
// prices/historical-data usan $queryRaw (en vez del query builder de Prisma)
// porque dependen de STDDEV/AVG de Postgres, igual que el original.
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Periods

  // Express devolvía `SELECT * FROM periods` directamente (columnas snake_case
  // sin transformar), y el frontend lee period.start_date/end_date de ahí en
  // vez de camelCase. Prisma serializa con los nombres de campo del schema
  // (startDate/endDate), así que hay que remapear a mano para no romper
  // PeriodsManager.jsx, igual que se hace con commerce_id/assigned_at en
  // commerce-assignments.service.ts.
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

  async getPeriods() {
    const periods = await this.prisma.period.findMany({
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
  }: CreatePeriodDto) {
    const existingPeriod = await this.prisma.period.findFirst({
      where: { month, year },
      select: { id: true },
    });

    if (existingPeriod) {
      throw new ConflictException(
        `Ya existe un período de recolección para ${name}.`,
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
      },
    });
    return this.mapPeriod(period);
  }

  async updatePeriod(id: number, { start_date, end_date }: UpdatePeriodDto) {
    try {
      const period = await this.prisma.period.update({
        where: { id },
        data: { startDate: start_date, endDate: end_date },
      });
      return this.mapPeriod(period);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Período no encontrado');
      }
      throw error;
    }
  }

  async updatePeriodStatus(id: number, status: string) {
    if (status === 'Open') {
      const openPeriod = await this.prisma.period.findFirst({
        where: { status: 'Open', id: { not: id } },
        select: { id: true },
      });

      if (openPeriod) {
        throw new ConflictException(
          'Ya existe otro período abierto. Ciérrelo antes de abrir uno nuevo.',
        );
      }
    }

    try {
      const period = await this.prisma.period.update({
        where: { id },
        data: { status },
      });
      return this.mapPeriod(period);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Período no encontrado');
      }
      throw error;
    }
  }

  // Analysis

  async getAnalysis(periodAId: number, periodBId: number) {
    const [pricesA, pricesB, allProducts, allCategories] = await Promise.all([
      this.prisma.price.findMany({
        where: { periodId: periodAId },
        select: { productId: true, price: true },
      }),
      this.prisma.price.findMany({
        where: { periodId: periodBId },
        select: { productId: true, price: true },
      }),
      this.prisma.product.findMany({
        select: { id: true, name: true, categoryId: true },
      }),
      this.prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

    const calculateAverages = (
      priceRows: { productId: number | null; price: Prisma.Decimal }[],
    ) => {
      const priceMap = new Map<number, number[]>();
      priceRows.forEach((row) => {
        if (row.productId == null) return;
        if (!priceMap.has(row.productId)) priceMap.set(row.productId, []);
        const price = Number(row.price);
        if (!isNaN(price)) {
          priceMap.get(row.productId)!.push(price);
        }
      });

      const avgMap = new Map<number, number>();
      priceMap.forEach((prices, productId) => {
        if (prices.length > 0) {
          // Primera pasada: media y desvío estándar
          const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
          const stdDev =
            prices.length > 1
              ? Math.sqrt(
                  prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
                    prices.length,
                )
              : 0;

          // Segunda pasada: descarta outliers con la regla de 2-sigma (igual que getPrices)
          const filtered =
            stdDev > 0
              ? prices.filter((p) => Math.abs(p - mean) <= 2 * stdDev)
              : prices;

          if (filtered.length > 0) {
            const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
            avgMap.set(productId, avg);
          }
        }
      });
      return avgMap;
    };

    const avgPricesA = calculateAverages(pricesA);
    const avgPricesB = calculateAverages(pricesB);

    let totalCostA = 0;
    let totalCostB = 0;

    const calculateVariation = (costA: number, costB: number) => {
      if (costB > 0) {
        return ((costA - costB) / costB) * 100;
      }
      return costA > 0 ? 100 : 0;
    };

    const categoryAnalysis = allCategories.map((cat) => {
      const categoryProducts = allProducts.filter(
        (p) => p.categoryId === cat.id,
      );
      let catCostA = 0;
      let catCostB = 0;

      const productAnalysis = categoryProducts.map((p) => {
        const priceA = avgPricesA.get(p.id) || 0;
        const priceB = avgPricesB.get(p.id) || 0;
        catCostA += priceA;
        catCostB += priceB;
        return {
          id: p.id,
          name: p.name,
          priceA,
          priceB,
          variation: calculateVariation(priceA, priceB),
        };
      });

      totalCostA += catCostA;
      totalCostB += catCostB;

      return {
        id: cat.id,
        name: cat.name,
        costA: catCostA,
        costB: catCostB,
        variation: calculateVariation(catCostA, catCostB),
        products: productAnalysis,
      };
    });

    const totalVariation = calculateVariation(totalCostA, totalCostB);

    return {
      categoryAnalysis,
      totalCostA,
      totalCostB,
      totalVariation,
    };
  }

  getHistoricalData(productId?: number, categoryId?: number) {
    if (productId != null) {
      return this.prisma.$queryRaw<HistoricalRow[]>`
        SELECT p.name, AVG(pr.price) as "avgPrice"
        FROM prices pr
        JOIN periods p ON pr.period_id = p.id
        WHERE pr.product_id = ${productId}
        GROUP BY p.id, p.name, p.year, p.month
        ORDER BY p.year, p.month;
      `;
    }

    if (categoryId != null) {
      return this.prisma.$queryRaw<HistoricalRow[]>`
        SELECT p.name, AVG(pr.price) as "avgPrice"
        FROM prices pr
        JOIN products prod ON pr.product_id = prod.id
        JOIN periods p ON pr.period_id = p.id
        WHERE prod.category_id = ${categoryId}
        GROUP BY p.id, p.name, p.year, p.month
        ORDER BY p.year, p.month;
      `;
    }

    throw new BadRequestException('Se requiere productId o categoryId');
  }

  // Prices

  getPrices(filters: {
    periodId?: number;
    categoryId?: number;
    productId?: number;
    userId?: number;
    commerceId?: number;
    showOutliersOnly?: boolean;
  }) {
    const conditions: Prisma.Sql[] = [];

    if (filters.periodId != null) {
      conditions.push(Prisma.sql`pr.period_id = ${filters.periodId}`);
    }
    if (filters.categoryId != null) {
      conditions.push(Prisma.sql`p.category_id = ${filters.categoryId}`);
    }
    if (filters.productId != null) {
      conditions.push(Prisma.sql`pr.product_id = ${filters.productId}`);
    }
    if (filters.userId != null) {
      conditions.push(Prisma.sql`pr.user_id = ${filters.userId}`);
    }
    if (filters.commerceId != null) {
      conditions.push(Prisma.sql`pr.commerce_id = ${filters.commerceId}`);
    }
    if (filters.showOutliersOnly) {
      conditions.push(
        Prisma.sql`(ps.std_dev > 0 AND ABS(pr.price - ps.avg_price) > (2 * ps.std_dev))`,
      );
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const query = Prisma.sql`
      WITH price_stats AS (
          SELECT period_id, product_id, AVG(price) as avg_price, STDDEV(price) as std_dev
          FROM prices
          GROUP BY period_id, product_id
      )
      SELECT
          pr.id, pr.price, pr.created_at AS "createdAt",
          pd.name AS "periodName", p.name AS "productName",
          cat.name AS "categoryName",
          u.name AS "userName", c.name AS "commerceName",
          CASE
              WHEN ps.std_dev > 0 AND ABS(pr.price - ps.avg_price) > (2 * ps.std_dev)
              THEN TRUE ELSE FALSE
          END AS "isOutlier"
      FROM prices pr
      JOIN periods pd ON pr.period_id = pd.id
      JOIN products p ON pr.product_id = p.id
      JOIN categories cat ON p.category_id = cat.id
      JOIN users u ON pr.user_id = u.id
      JOIN commerces c ON pr.commerce_id = c.id
      LEFT JOIN price_stats ps ON pr.period_id = ps.period_id AND pr.product_id = ps.product_id
      ${whereClause}
      ORDER BY pr.created_at DESC;
    `;

    return this.prisma.$queryRaw<PriceRow[]>(query);
  }

  async updatePrice(id: number, price: number) {
    try {
      return await this.prisma.price.update({ where: { id }, data: { price } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Precio no encontrado');
      }
      throw error;
    }
  }

  async deletePrice(id: number) {
    try {
      await this.prisma.price.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Precio no encontrado');
      }
      throw error;
    }
  }

  // Users

  getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, roles: true },
      orderBy: { name: 'asc' },
    });
  }

  async createUser({
    name,
    email,
    password,
    roles,
  }: {
    name: string;
    email: string;
    password: string;
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

    return this.prisma.user.create({
      data: { name, email, passwordHash, roles },
      select: { id: true, name: true, email: true, roles: true },
    });
  }

  async updateUser(userId: number, { name, email, roles }: UpdateUserDto) {
    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException('Ya existe otro usuario con ese email');
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { name, email, roles },
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

  async updateUserPassword(userId: number, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
        select: { id: true },
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

    return { success: true };
  }

  deleteUser(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const priceCount = await tx.price.count({ where: { userId } });

      if (priceCount > 0) {
        throw new ConflictException(
          `No se puede eliminar el usuario porque tiene ${priceCount} precio(s) registrado(s). Los datos históricos deben preservarse.`,
        );
      }

      // Los borradores sí se pueden eliminar
      await tx.draftPrice.deleteMany({ where: { userId } });
      await tx.commerceAssignment.deleteMany({ where: { userId } });

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

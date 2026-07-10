import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Port 1:1 de inflacion_app_backend/services/categoryService.js.
// El chequeo de duplicado se hace a nivel de aplicación (igual que antes)
// porque la tabla `categories` no tiene un UNIQUE en `name` en el schema.
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    return this.prisma.category.create({ data: { name } });
  }

  async update(id: number, name: string) {
    const existing = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
    });

    if (existing) {
      throw new ConflictException('Ya existe otra categoría con ese nombre');
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Categoría no encontrada');
      }
      throw error;
    }
  }

  async remove(id: number) {
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s)`,
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Categoría no encontrada');
      }
      throw error;
    }

    return { success: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Port 1:1 de inflacion_app_backend/controllers/productController.js
// (en Express no hay capa de servicio para products; se agrega acá para
// mantener el mismo patrón que el resto de los módulos).
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string, unit: string, categoryId: number) {
    return this.prisma.product.create({ data: { name, unit, categoryId } });
  }

  async update(id: number, name: string, unit: string) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { name, unit },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Producto no encontrado');
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Producto no encontrado');
      }
      throw error;
    }
  }
}

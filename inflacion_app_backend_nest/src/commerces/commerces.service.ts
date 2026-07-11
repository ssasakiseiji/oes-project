import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CommerceWithAssignments = Prisma.CommerceGetPayload<{
  include: { commerceAssignments: { include: { user: true } } };
}>;

// Port de inflacion_app_backend/services/commerceService.js. Las queries con
// ARRAY_AGG/json_build_object del original se resuelven acá con relaciones
// de Prisma en vez de SQL crudo — no hay STDDEV/CTEs de por medio, así que
// el query builder alcanza sin perder legibilidad ni precisión.
//
// Nota: el Express original tira un Error genérico (sin statusCode) en los
// "no encontrado", lo que caía como 500 en el errorHandler viejo. Acá se usa
// NotFoundException (404) a propósito — es una mejora menor y deliberada,
// no una reproducción bit a bit del bug.
@Injectable()
export class CommercesService {
  constructor(private readonly prisma: PrismaService) {}

  private toCommerceWithStudents(commerce: CommerceWithAssignments) {
    const students = commerce.commerceAssignments.map(
      (assignment) => assignment.user,
    );
    return {
      id: commerce.id,
      name: commerce.name,
      address: commerce.address,
      assigned_students_count: students.length,
      assigned_students: students,
    };
  }

  async findAll() {
    const commerces = await this.prisma.commerce.findMany({
      orderBy: { name: 'asc' },
      include: {
        commerceAssignments: {
          where: { user: { roles: { has: 'student' } } },
          include: { user: true },
        },
      },
    });

    return commerces.map((commerce) => this.toCommerceWithStudents(commerce));
  }

  async findOne(id: number) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { id },
      include: {
        commerceAssignments: {
          where: { user: { roles: { has: 'student' } } },
          include: { user: true },
        },
      },
    });

    if (!commerce) {
      throw new NotFoundException('Comercio no encontrado');
    }

    return this.toCommerceWithStudents(commerce);
  }

  async getStudents(commerceId: number) {
    const assignments = await this.prisma.commerceAssignment.findMany({
      where: { commerceId, user: { roles: { has: 'student' } } },
      include: { user: true },
      orderBy: { user: { name: 'asc' } },
    });

    return assignments.map((assignment) => ({
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
      assigned_at: assignment.assignedAt,
    }));
  }

  create(name: string, address: string) {
    return this.prisma.commerce.create({ data: { name, address } });
  }

  async update(id: number, name: string, address: string) {
    try {
      return await this.prisma.commerce.update({
        where: { id },
        data: { name, address },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Comercio no encontrado');
      }
      throw error;
    }
  }

  async remove(id: number) {
    // commerce_assignments y draft_prices tienen ON DELETE CASCADE en el
    // schema (igual que en supabase-setup.sql), no hace falta borrarlos a mano
    // como hacía la transacción manual del backend Express.
    try {
      const commerce = await this.prisma.commerce.delete({ where: { id } });
      return { success: true, id: commerce.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Comercio no encontrado');
      }
      throw error;
    }
  }
}

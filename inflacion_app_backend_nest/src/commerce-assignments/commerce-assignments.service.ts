import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Port de inflacion_app_backend/services/commerceAssignmentService.js.
// Igual que en commerces.service.ts: los "no encontrado" que en Express
// caían como 500 (Error genérico sin statusCode) acá usan NotFoundException
// (404) a propósito.
@Injectable()
export class CommerceAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentsWithAssignments() {
    const [students, allCommerces, assignments] = await Promise.all([
      this.prisma.user.findMany({
        where: { roles: { has: 'student' } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.commerce.findMany({
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.commerceAssignment.findMany({
        select: { userId: true, commerceId: true },
      }),
    ]);

    const studentsWithAssignments = students.map((student) => {
      const assignedCommerceIds = assignments
        .filter((a) => a.userId === student.id)
        .map((a) => a.commerceId);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        assignedCommerces: assignedCommerceIds,
        assignedCommercesData: allCommerces.filter((c) =>
          assignedCommerceIds.includes(c.id),
        ),
      };
    });

    return { students: studentsWithAssignments, allCommerces };
  }

  async getStudentAssignments(userId: number) {
    const assignments = await this.prisma.commerceAssignment.findMany({
      where: { userId },
      include: { commerce: true },
      orderBy: { commerce: { name: 'asc' } },
    });

    return assignments.map((a) => ({
      id: a.id,
      commerce_id: a.commerceId,
      commerce_name: a.commerce.name,
      commerce_address: a.commerce.address,
      assigned_at: a.assignedAt,
    }));
  }

  async assignCommercesToStudent(
    userId: number,
    commerceIds: number[],
    assignedBy: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.commerceAssignment.findMany({
        where: { userId },
        select: { commerceId: true },
      });
      const existingIds = existing.map((e) => e.commerceId);
      const newIds = commerceIds ?? [];
      const unassignedIds = existingIds.filter((id) => !newIds.includes(id));

      if (unassignedIds.length > 0) {
        await tx.draftPrice.deleteMany({
          where: { userId, commerceId: { in: unassignedIds } },
        });
      }

      await tx.commerceAssignment.deleteMany({ where: { userId } });

      if (newIds.length > 0) {
        await tx.commerceAssignment.createMany({
          data: newIds.map((commerceId) => ({
            userId,
            commerceId,
            assignedBy,
          })),
        });
      }
    });

    return this.getStudentAssignments(userId);
  }

  async bulkAssignCommerces(
    userIds: number[],
    commerceIds: number[],
    assignedBy: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        await tx.commerceAssignment.deleteMany({ where: { userId } });

        if (commerceIds && commerceIds.length > 0) {
          await tx.commerceAssignment.createMany({
            data: commerceIds.map((commerceId) => ({
              userId,
              commerceId,
              assignedBy,
            })),
          });
        }
      }
    });
  }

  async getAssignmentsSummary() {
    const commerces = await this.prisma.commerce.findMany({
      orderBy: { name: 'asc' },
      include: {
        commerceAssignments: {
          where: { user: { roles: { has: 'student' } } },
          include: { user: { select: { name: true } } },
          orderBy: { user: { name: 'asc' } },
        },
      },
    });

    return commerces.map((c) => ({
      commerce_id: c.id,
      commerce_name: c.name,
      assigned_students: c.commerceAssignments.length,
      student_names: c.commerceAssignments.map((a) => a.user.name),
    }));
  }

  async assignCommerceToStudents(
    commerceId: number,
    studentIds: number[],
    assignedBy: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.commerceAssignment.findMany({
        where: { commerceId, userId: { in: studentIds } },
        include: { user: { select: { name: true } } },
      });

      if (existing.length > 0) {
        const names = existing.map((a) => a.user.name).join(', ');
        throw new ConflictException({
          message: `Ya existe asignación para: ${names}`,
          type: 'duplicate_assignment',
        });
      }

      if (studentIds.length > 0) {
        await tx.commerceAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            commerceId,
            assignedBy,
          })),
        });
      }

      return { success: true, assigned: studentIds.length };
    });
  }

  async removeAssignment(userId: number, commerceId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.draftPrice.deleteMany({ where: { userId, commerceId } });

      const deleted = await tx.commerceAssignment.deleteMany({
        where: { userId, commerceId },
      });

      if (deleted.count === 0) {
        throw new NotFoundException('Asignación no encontrada');
      }

      return { success: true };
    });
  }
}

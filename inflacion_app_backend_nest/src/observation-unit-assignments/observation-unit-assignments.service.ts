import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fase H: renombrado de dominio, CommerceAssignment -> ObservationUnitAssignment
// (port 1:1 de commerce-assignments.service.ts).
@Injectable()
export class ObservationUnitAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentsWithAssignments() {
    const [students, allObservationUnits, assignments] = await Promise.all([
      this.prisma.user.findMany({
        where: { roles: { has: 'student' } },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.observationUnit.findMany({
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.observationUnitAssignment.findMany({
        select: { userId: true, observationUnitId: true },
      }),
    ]);

    const studentsWithAssignments = students.map((student) => {
      const assignedObservationUnitIds = assignments
        .filter((a) => a.userId === student.id)
        .map((a) => a.observationUnitId);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        assignedObservationUnits: assignedObservationUnitIds,
        assignedObservationUnitsData: allObservationUnits.filter((u) =>
          assignedObservationUnitIds.includes(u.id),
        ),
      };
    });

    return { students: studentsWithAssignments, allObservationUnits };
  }

  async getStudentAssignments(userId: number) {
    const assignments = await this.prisma.observationUnitAssignment.findMany({
      where: { userId },
      include: { observationUnit: true },
      orderBy: { observationUnit: { name: 'asc' } },
    });

    return assignments.map((a) => ({
      id: a.id,
      observation_unit_id: a.observationUnitId,
      observation_unit_name: a.observationUnit.name,
      observation_unit_address: a.observationUnit.address,
      assigned_at: a.assignedAt,
    }));
  }

  async assignObservationUnitsToStudent(
    userId: number,
    observationUnitIds: number[],
    assignedBy: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.observationUnitAssignment.findMany({
        where: { userId },
        select: { observationUnitId: true },
      });
      const existingIds = existing.map((e) => e.observationUnitId);
      const newIds = observationUnitIds ?? [];
      const unassignedIds = existingIds.filter((id) => !newIds.includes(id));

      if (unassignedIds.length > 0) {
        await tx.draftObservation.deleteMany({
          where: { userId, observationUnitId: { in: unassignedIds } },
        });
      }

      await tx.observationUnitAssignment.deleteMany({ where: { userId } });

      if (newIds.length > 0) {
        await tx.observationUnitAssignment.createMany({
          data: newIds.map((observationUnitId) => ({
            userId,
            observationUnitId,
            assignedBy,
          })),
        });
      }
    });

    return this.getStudentAssignments(userId);
  }

  async bulkAssignObservationUnits(
    userIds: number[],
    observationUnitIds: number[],
    assignedBy: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        await tx.observationUnitAssignment.deleteMany({ where: { userId } });

        if (observationUnitIds && observationUnitIds.length > 0) {
          await tx.observationUnitAssignment.createMany({
            data: observationUnitIds.map((observationUnitId) => ({
              userId,
              observationUnitId,
              assignedBy,
            })),
          });
        }
      }
    });
  }

  async getAssignmentsSummary() {
    const observationUnits = await this.prisma.observationUnit.findMany({
      orderBy: { name: 'asc' },
      include: {
        observationUnitAssignments: {
          where: { user: { roles: { has: 'student' } } },
          include: { user: { select: { name: true } } },
          orderBy: { user: { name: 'asc' } },
        },
      },
    });

    return observationUnits.map((u) => ({
      observation_unit_id: u.id,
      observation_unit_name: u.name,
      assigned_students: u.observationUnitAssignments.length,
      student_names: u.observationUnitAssignments.map((a) => a.user.name),
    }));
  }

  async assignObservationUnitToStudents(
    observationUnitId: number,
    studentIds: number[],
    assignedBy: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.observationUnitAssignment.findMany({
        where: { observationUnitId, userId: { in: studentIds } },
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
        await tx.observationUnitAssignment.createMany({
          data: studentIds.map((userId) => ({
            userId,
            observationUnitId,
            assignedBy,
          })),
        });
      }

      return { success: true, assigned: studentIds.length };
    });
  }

  async removeAssignment(userId: number, observationUnitId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.draftObservation.deleteMany({
        where: { userId, observationUnitId },
      });

      const deleted = await tx.observationUnitAssignment.deleteMany({
        where: { userId, observationUnitId },
      });

      if (deleted.count === 0) {
        throw new NotFoundException('Asignación no encontrada');
      }

      return { success: true };
    });
  }
}

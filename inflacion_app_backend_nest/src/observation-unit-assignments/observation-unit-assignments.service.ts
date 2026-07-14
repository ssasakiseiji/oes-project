import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectMembershipsService } from '../projects/project-memberships.service';

// Fase H: renombrado de dominio, CommerceAssignment -> ObservationUnitAssignment
// (port 1:1 de commerce-assignments.service.ts).
//
// Fase Q: scoped por proyecto. Cambio de comportamiento real y necesario
// (no solo un filtro agregado): las operaciones de "reemplazar todas las
// asignaciones de un estudiante" (assignObservationUnitsToStudent,
// bulkAssignObservationUnits) hacían antes un `deleteMany({where:{userId}})`
// GLOBAL -- con multi-proyecto eso borraría también las asignaciones del
// estudiante en CUALQUIER OTRO proyecto. Ahora el delete se scopea con
// `observationUnit: {projectId}` para tocar solo las asignaciones de este
// proyecto. Además, asignar una unidad a un estudiante que todavía no es
// miembro del proyecto de esa unidad le otorga automáticamente
// ProjectMembership con rol 'student' (decisión confirmada con el usuario).
@Injectable()
export class ObservationUnitAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectMemberships: ProjectMembershipsService,
  ) {}

  private async assertObservationUnitsInProject(
    observationUnitIds: number[],
    projectId: number,
  ) {
    if (observationUnitIds.length === 0) return;

    const count = await this.prisma.observationUnit.count({
      where: { id: { in: observationUnitIds }, projectId },
    });

    if (count !== new Set(observationUnitIds).size) {
      throw new BadRequestException(
        'Una o más unidades de observación no pertenecen a este proyecto',
      );
    }
  }

  async getStudentsWithAssignments(projectId: number) {
    const [students, allObservationUnits, assignments] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          projectMemberships: {
            some: { projectId, roles: { has: 'student' } },
          },
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.observationUnit.findMany({
        where: { projectId },
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.observationUnitAssignment.findMany({
        where: { observationUnit: { projectId } },
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

  async getStudentAssignments(userId: number, projectId: number) {
    const assignments = await this.prisma.observationUnitAssignment.findMany({
      where: { userId, observationUnit: { projectId } },
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
    projectId: number,
  ) {
    const newIds = observationUnitIds ?? [];
    await this.assertObservationUnitsInProject(newIds, projectId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.observationUnitAssignment.findMany({
        where: { userId, observationUnit: { projectId } },
        select: { observationUnitId: true },
      });
      const existingIds = existing.map((e) => e.observationUnitId);
      const unassignedIds = existingIds.filter((id) => !newIds.includes(id));

      if (unassignedIds.length > 0) {
        await tx.draftObservation.deleteMany({
          where: { userId, observationUnitId: { in: unassignedIds } },
        });
      }

      await tx.observationUnitAssignment.deleteMany({
        where: { userId, observationUnit: { projectId } },
      });

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

    if (newIds.length > 0) {
      await this.projectMemberships.ensureMembership(projectId, userId, [
        'student',
      ]);
    }

    return this.getStudentAssignments(userId, projectId);
  }

  async bulkAssignObservationUnits(
    userIds: number[],
    observationUnitIds: number[],
    assignedBy: number,
    projectId: number,
  ) {
    await this.assertObservationUnitsInProject(
      observationUnitIds ?? [],
      projectId,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        await tx.observationUnitAssignment.deleteMany({
          where: { userId, observationUnit: { projectId } },
        });

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

    if (observationUnitIds && observationUnitIds.length > 0) {
      await Promise.all(
        userIds.map((userId) =>
          this.projectMemberships.ensureMembership(projectId, userId, [
            'student',
          ]),
        ),
      );
    }
  }

  async getAssignmentsSummary(projectId: number) {
    const observationUnits = await this.prisma.observationUnit.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        observationUnitAssignments: {
          where: {
            user: {
              projectMemberships: {
                some: { projectId, roles: { has: 'student' } },
              },
            },
          },
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
    projectId: number,
  ) {
    await this.assertObservationUnitsInProject([observationUnitId], projectId);

    const result = await this.prisma.$transaction(async (tx) => {
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

    await Promise.all(
      studentIds.map((userId) =>
        this.projectMemberships.ensureMembership(projectId, userId, [
          'student',
        ]),
      ),
    );

    return result;
  }

  async removeAssignment(
    userId: number,
    observationUnitId: number,
    projectId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.draftObservation.deleteMany({
        where: { userId, observationUnitId },
      });

      const deleted = await tx.observationUnitAssignment.deleteMany({
        where: { userId, observationUnitId, observationUnit: { projectId } },
      });

      if (deleted.count === 0) {
        throw new NotFoundException('Asignación no encontrada');
      }

      return { success: true };
    });
  }
}

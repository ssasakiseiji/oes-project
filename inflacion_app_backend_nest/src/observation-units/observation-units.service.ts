import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const assignedUserSelect = {
  id: true,
  name: true,
  email: true,
  roles: true,
} as const;

type ObservationUnitWithAssignments = Prisma.ObservationUnitGetPayload<{
  include: {
    observationUnitAssignments: {
      include: { user: { select: typeof assignedUserSelect } };
    };
  };
}>;

// Fase H: renombrado de dominio, Commerce -> ObservationUnit (port 1:1 de
// commerces.service.ts). Las queries usan relaciones de Prisma en vez de
// SQL crudo — no hay STDDEV/CTEs de por medio, así que el query builder
// alcanza sin perder legibilidad ni precisión.
//
// Nota: NotFoundException (404) en los "no encontrado" es una mejora menor
// y deliberada sobre el 500 genérico del Express original — ver comentario
// heredado en el service pre-rename.
//
// Bug de seguridad encontrado y corregido acá (Fase H): el `include: {
// user: true }` original traía TODAS las columnas del usuario, incluyendo
// `passwordHash`, y las devolvía tal cual en assigned_students -- se
// reemplaza por un `select` explícito sin el hash. Existía igual en
// commerces.service.ts antes del rename; ver aviso al usuario sobre
// backportear el mismo fix al Express original en `main`.
//
// Fase Q: scoped por proyecto. El filtro de "estudiantes asignados" pasa de
// `user.roles` global a ProjectMembership del proyecto de esta unidad --
// antes de Fase Q, roles era global así que cualquier 'student' calificaba;
// ahora hay que exigir que sea 'student' específicamente EN ESTE proyecto.
@Injectable()
export class ObservationUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  private toObservationUnitWithStudents(
    observationUnit: ObservationUnitWithAssignments,
  ) {
    const students = observationUnit.observationUnitAssignments.map(
      (assignment) => assignment.user,
    );
    return {
      id: observationUnit.id,
      name: observationUnit.name,
      address: observationUnit.address,
      assigned_students_count: students.length,
      assigned_students: students,
    };
  }

  async findAll(projectId: number) {
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
          include: { user: { select: assignedUserSelect } },
        },
      },
    });

    return observationUnits.map((unit) =>
      this.toObservationUnitWithStudents(unit),
    );
  }

  async findOne(id: number, projectId: number) {
    const observationUnit = await this.prisma.observationUnit.findUnique({
      where: { id },
      include: {
        observationUnitAssignments: {
          where: {
            user: {
              projectMemberships: {
                some: { projectId, roles: { has: 'student' } },
              },
            },
          },
          include: { user: { select: assignedUserSelect } },
        },
      },
    });

    if (!observationUnit || observationUnit.projectId !== projectId) {
      throw new NotFoundException('Unidad de observación no encontrada');
    }

    return this.toObservationUnitWithStudents(observationUnit);
  }

  async getStudents(observationUnitId: number, projectId: number) {
    const unit = await this.prisma.observationUnit.findUnique({
      where: { id: observationUnitId },
      select: { projectId: true },
    });
    if (!unit || unit.projectId !== projectId) {
      throw new NotFoundException('Unidad de observación no encontrada');
    }

    const assignments = await this.prisma.observationUnitAssignment.findMany({
      where: {
        observationUnitId,
        user: {
          projectMemberships: {
            some: { projectId, roles: { has: 'student' } },
          },
        },
      },
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

  create(name: string, address: string, projectId: number) {
    return this.prisma.observationUnit.create({
      data: { name, address, projectId },
    });
  }

  async update(id: number, name: string, address: string, projectId: number) {
    const existing = await this.prisma.observationUnit.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundException('Unidad de observación no encontrada');
    }

    return this.prisma.observationUnit.update({
      where: { id },
      data: { name, address },
    });
  }

  async remove(id: number, projectId: number) {
    const existing = await this.prisma.observationUnit.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundException('Unidad de observación no encontrada');
    }

    const observationCount = await this.prisma.observation.count({
      where: { observationUnitId: id },
    });

    if (observationCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la unidad de observación porque tiene ${observationCount} observación(es) registrada(s). Los datos históricos deben preservarse.`,
      );
    }

    // observation_unit_assignments y draft_observations tienen ON DELETE
    // CASCADE en el schema, no hace falta borrarlos a mano.
    const observationUnit = await this.prisma.observationUnit.delete({
      where: { id },
    });
    return { success: true, id: observationUnit.id };
  }
}

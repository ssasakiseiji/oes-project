import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectMember {
  userId: number;
  name: string;
  email: string;
  roles: string[];
}

// Fase P: gestión de membership por proyecto. ensureMembership() es
// consumido directamente por observation-unit-assignments.service.ts
// (Fase Q) para la auto-alta de membership al asignar una ObservationUnit a
// un estudiante que todavía no es miembro del proyecto de esa unidad.
@Injectable()
export class ProjectMembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  // A diferencia de upsert() (que REEMPLAZA roles -- pensado para que un
  // admin fije explícitamente el rol de alguien), esto solo AGREGA roles
  // que todavía no tenga, sin pisar los existentes. Necesario para la
  // auto-alta al asignar una ObservationUnit: si el usuario ya es 'admin'
  // de este proyecto por otra vía, asignarle una unidad no debe degradarlo
  // a solo 'student'.
  async ensureMembership(projectId: number, userId: number, roles: string[]) {
    const existing = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { roles: true },
    });

    if (!existing) {
      return this.prisma.projectMembership.create({
        data: { projectId, userId, roles },
      });
    }

    const missing = roles.filter((role) => !existing.roles.includes(role));
    if (missing.length === 0) {
      return existing;
    }

    return this.prisma.projectMembership.update({
      where: { projectId_userId: { projectId, userId } },
      data: { roles: [...existing.roles, ...missing] },
    });
  }

  async findByProject(projectId: number): Promise<ProjectMember[]> {
    const memberships = await this.prisma.projectMembership.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      roles: m.roles,
    }));
  }

  async upsert(projectId: number, userId: number, roles: string[]) {
    const [project, user] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.projectMembership.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, roles },
      update: { roles },
    });
  }

  // No toca Observation ya enviadas -- preserva datos históricos, mismo
  // espíritu que el guard de borrado de AdminService#deleteUser.
  async remove(projectId: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.draftObservation.deleteMany({
        where: { userId, observationUnit: { projectId } },
      });
      await tx.observationUnitAssignment.deleteMany({
        where: { userId, observationUnit: { projectId } },
      });

      const deleted = await tx.projectMembership.deleteMany({
        where: { projectId, userId },
      });

      if (deleted.count === 0) {
        throw new NotFoundException('Membership no encontrada');
      }

      return { success: true };
    });
  }
}

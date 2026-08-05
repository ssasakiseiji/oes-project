import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.schema';

export interface ProjectMembershipSummary {
  projectId: number;
  projectName: string;
  isArchived: boolean;
  roles: string[];
}

// Fase P: CRUD de Project + /projects/mine, que alimenta el selector de
// proyecto del frontend (ver ProjectContext, Fase U).
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({ orderBy: { name: 'asc' } });
  }

  // Un superadmin actúa como admin implícito de CUALQUIER proyecto (decisión
  // confirmada), así que acá ve todos los proyectos con rol 'admin'
  // sintético -- no hace falta que tenga su propia fila ProjectMembership
  // para que el selector de proyecto del frontend le deje operar en
  // cualquiera igual que a un admin normal de ese proyecto.
  //
  // Ojo: el 'admin' sintético se SUMA a los roles de su membership real, no
  // la reemplaza. Devolver siempre ['admin'] pelado le borraba los roles que
  // sí tiene cargados (ej. {admin,monitor,student}) y dejaba al selector de
  // rol del header sin nada para elegir (hasMultipleRoles = false), así que
  // un superadmin no podía cambiarse a la vista de monitor/estudiante.
  async findMine(user: {
    id: number;
    roles: string[];
  }): Promise<ProjectMembershipSummary[]> {
    if (user.roles?.includes('superadmin')) {
      const [allProjects, memberships] = await Promise.all([
        this.prisma.project.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.projectMembership.findMany({
          where: { userId: user.id },
        }),
      ]);

      const rolesByProject = new Map(
        memberships.map((m) => [m.projectId, m.roles]),
      );

      return allProjects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        isArchived: p.isArchived,
        roles: [
          ...new Set(['admin', ...(rolesByProject.get(p.id) ?? [])]),
        ],
      }));
    }

    const memberships = await this.prisma.projectMembership.findMany({
      where: { userId: user.id },
      include: { project: true },
      orderBy: { project: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      projectId: m.project.id,
      projectName: m.project.name,
      isArchived: m.project.isArchived,
      roles: m.roles,
    }));
  }

  async create(dto: CreateProjectDto, creatorUserId: number) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { name: dto.name, description: dto.description },
      });

      // El superadmin que crea el proyecto queda también como admin
      // explícito vía ProjectMembership -- redundante con el bypass de
      // superadmin, pero deja el estado consistente si en el futuro deja de
      // ser superadmin y necesita seguir administrando este proyecto.
      await tx.projectMembership.create({
        data: {
          projectId: project.id,
          userId: creatorUserId,
          roles: ['admin'],
        },
      });

      return project;
    });
  }

  async update(id: number, dto: UpdateProjectDto) {
    try {
      return await this.prisma.project.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Proyecto no encontrado');
      }
      throw error;
    }
  }
}

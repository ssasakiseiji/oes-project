import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from './jwt-auth.guard';

export type RequestWithProject = RequestWithUser & { projectId: number };

// Guard project-scoped, hermano de RolesGuard: en vez de confiar en
// request.user.roles (viene del JWT, puede quedar stale hasta 8h si un
// admin cambia la membership de alguien a mitad de sesión), hace un lookup
// fresco de ProjectMembership por (userId, projectId) en cada request --
// mismo principio que CollectionPeriodGuard ya aplica para el período
// activo.
//
// Diferencia clave con RolesGuard: ahí, "sin @Roles(...)" significa "pasa
// cualquier usuario autenticado". Acá NO puede significar lo mismo, porque
// projectId es un parámetro que controla quien llama (query/body) -- por
// eso la membership es SIEMPRE obligatoria, incluso en rutas sin @Roles().
// @Roles(...), cuando está presente, agrega el chequeo de rol *dentro* de
// esa membership (con la misma regla ya existente en RolesGuard: pedir
// 'monitor' también admite a un 'admin').
//
// Un usuario con 'superadmin' en su User.roles global actúa como admin
// implícito de cualquier proyecto, sin necesitar su propia fila
// ProjectMembership (decisión confirmada con el usuario).
@Injectable()
export class ProjectRolesGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithProject>();
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const projectId = resolveProjectId(request);
    if (projectId === null) {
      throw new ForbiddenException('projectId es requerido.');
    }
    request.projectId = projectId;

    if (request.user.roles?.includes('superadmin')) {
      return true;
    }

    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId: request.user.id } },
      select: { roles: true },
    });

    if (!membership) {
      throw new ForbiddenException('No sos miembro de este proyecto.');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.some((role) =>
      role === 'monitor'
        ? membership.roles.includes('monitor') ||
          membership.roles.includes('admin')
        : membership.roles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere alguno de estos roles en este proyecto: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}

// GET/DELETE mandan projectId por query string, POST/PUT por body -- mismo
// patrón que ya usa este backend para periodId como filtro (ver
// admin.controller.ts). Nunca por path param: las rutas de este proyecto se
// mantienen planas, sin nesting /projects/:projectId/....
function resolveProjectId(request: RequestWithProject): number | null {
  const fromQuery = request.query?.['projectId'];
  const fromBody = (request.body as Record<string, unknown> | undefined)?.[
    'projectId'
  ];
  const raw = fromQuery ?? fromBody;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../../auth/guards/jwt-auth.guard';

export type RequestWithActivePeriod = RequestWithUser & {
  activePeriodId: number;
  activeProjectId: number;
};

// Equivalente a inflacion_app_backend/middleware/auth.js#checkCollectionPeriod,
// ahora project-aware (Fase P). El proyecto se DERIVA del observationUnitId
// ya presente en el body -- nunca de un projectId declarado por el cliente,
// mismo principio que variable-value.ts aplica al dataType de una Variable:
// no confiar en lo que el cliente dice sobre una entidad, resolverlo desde
// la entidad misma. Expone tanto activePeriodId como activeProjectId en la
// request para que StudentsController/Service no tengan que re-derivarlos
// ni confiar en un valor separado enviado por el cliente.
@Injectable()
export class CollectionPeriodGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithActivePeriod>();

    const observationUnitId = Number(
      (request.body as Record<string, unknown> | undefined)?.[
        'observationUnitId'
      ],
    );

    if (!Number.isInteger(observationUnitId) || observationUnitId <= 0) {
      throw new ForbiddenException('observationUnitId es requerido.');
    }

    const observationUnit = await this.prisma.observationUnit.findUnique({
      where: { id: observationUnitId },
      select: { projectId: true },
    });

    if (!observationUnit || observationUnit.projectId === null) {
      throw new NotFoundException('Unidad de observación no encontrada.');
    }

    const openPeriod = await this.prisma.period.findFirst({
      where: { status: 'Open', projectId: observationUnit.projectId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    if (!openPeriod) {
      throw new ForbiddenException(
        'La recolección de datos está cerrada en este momento para este proyecto.',
      );
    }

    request.activePeriodId = openPeriod.id;
    request.activeProjectId = observationUnit.projectId;
    return true;
  }
}

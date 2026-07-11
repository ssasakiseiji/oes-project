import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../../auth/guards/jwt-auth.guard';

export type RequestWithActivePeriod = RequestWithUser & {
  activePeriodId: number;
};

// Equivalente a inflacion_app_backend/middleware/auth.js#checkCollectionPeriod:
// exige que exista un período con status 'Open' y expone su id en la request
// (request.activePeriodId) para que el controller lo use, igual que
// req.activePeriodId en el Express original.
@Injectable()
export class CollectionPeriodGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithActivePeriod>();

    const openPeriod = await this.prisma.period.findFirst({
      where: { status: 'Open' },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    if (!openPeriod) {
      throw new ForbiddenException(
        'La recolección de precios está cerrada en este momento.',
      );
    }

    request.activePeriodId = openPeriod.id;
    return true;
  }
}

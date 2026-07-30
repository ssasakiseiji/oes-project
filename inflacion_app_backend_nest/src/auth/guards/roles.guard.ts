import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from './jwt-auth.guard';

// Equivalente a authorizeAdmin/authorizeMonitor de
// inflacion_app_backend/middleware/auth.js: @Roles('monitor') también deja
// pasar a un admin, igual que hoy.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    const hasRole = requiredRoles.some((role) =>
      role === 'monitor'
        ? user.roles?.includes('monitor') || user.roles?.includes('admin')
        : user.roles?.includes(role),
    );

    if (!hasRole) {
      // Fase P: mensaje genérico en vez de los dos casos hardcodeados que
      // había antes (admin / monitor-o-admin) -- ese hardcodeo asumía que
      // 'admin'/'monitor' eran los únicos roles posibles vía @Roles(...),
      // y con 'superadmin' ahora en juego el mensaje anterior sería
      // directamente incorrecto para esas rutas.
      throw new ForbiddenException(
        `Acceso denegado. Se requiere alguno de estos roles: ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}

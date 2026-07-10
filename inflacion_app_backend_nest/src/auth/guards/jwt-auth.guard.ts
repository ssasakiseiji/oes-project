import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: number;
  name: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export type RequestWithUser = Request & { user: AuthenticatedUser };

// Equivalente a inflacion_app_backend/middleware/auth.js#authenticateToken:
// mismos códigos de estado (401 si falta el token, 403 si es inválido/expiró).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    try {
      request.user = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as AuthenticatedUser;
      return true;
    } catch {
      throw new ForbiddenException('Token inválido o expirado');
    }
  }
}

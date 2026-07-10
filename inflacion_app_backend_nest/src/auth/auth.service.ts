import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthUserPayload {
  id: number;
  name: string;
  roles: string[];
}

// Port 1:1 de inflacion_app_backend/services/authService.js#login
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload: AuthUserPayload = {
      id: user.id,
      name: user.name,
      roles: user.roles,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '8h',
    });

    return { token, user: payload };
  }
}

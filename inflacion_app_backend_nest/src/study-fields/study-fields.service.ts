import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Fase H: renombrado de dominio, Category -> StudyField (port 1:1 de
// categories.service.ts). El chequeo de duplicado se hace a nivel de
// aplicación porque la tabla `study_fields` no tiene un UNIQUE en `name`.
@Injectable()
export class StudyFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.studyField.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const existing = await this.prisma.studyField.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un campo de estudio con ese nombre',
      );
    }

    return this.prisma.studyField.create({ data: { name } });
  }

  async update(id: number, name: string) {
    const existing = await this.prisma.studyField.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe otro campo de estudio con ese nombre',
      );
    }

    try {
      return await this.prisma.studyField.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Campo de estudio no encontrado');
      }
      throw error;
    }
  }

  async remove(id: number) {
    const variableCount = await this.prisma.variable.count({
      where: { studyFieldId: id },
    });

    if (variableCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el campo de estudio porque tiene ${variableCount} variable(s) asociada(s)`,
      );
    }

    try {
      await this.prisma.studyField.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Campo de estudio no encontrado');
      }
      throw error;
    }

    return { success: true };
  }
}

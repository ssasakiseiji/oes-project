import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { configSchemaFor } from './dto/variable.schema';
import type {
  CreateVariableDto,
  UpdateVariableDto,
} from './dto/variable.schema';

// Fase H: renombrado de dominio, Product -> Variable (port de
// products.service.ts), más soporte real para tipos de dato distintos de
// numérico (dataType/config, ver dto/variable.schema.ts).
@Injectable()
export class VariablesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVariableDto) {
    return this.prisma.variable.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        dataType: dto.dataType,
        config: (dto.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        studyFieldId: dto.studyFieldId,
      },
    });
  }

  async update(id: number, dto: UpdateVariableDto) {
    const existing = await this.prisma.variable.findUnique({
      where: { id },
      select: { dataType: true },
    });

    if (!existing) {
      throw new NotFoundException('Variable no encontrada');
    }

    let config: Prisma.InputJsonValue | undefined;
    if (dto.config !== undefined) {
      const parsed = configSchemaFor(existing.dataType).safeParse(dto.config);
      if (!parsed.success) {
        throw new BadRequestException({
          message: 'Configuración inválida para el tipo de dato de la variable',
          errors: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      config = (parsed.data ?? Prisma.JsonNull) as Prisma.InputJsonValue;
    }

    try {
      return await this.prisma.variable.update({
        where: { id },
        data: {
          name: dto.name,
          unit: dto.unit,
          ...(config !== undefined ? { config } : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Variable no encontrada');
      }
      throw error;
    }
  }

  async remove(id: number) {
    // Guard agregado en Fase H/I: products.service.ts no lo tenía (a
    // diferencia de AdminService#deleteUser, que sí protege datos
    // históricos) -- se extiende acá el mismo patrón por consistencia, ver
    // plan de Fase I.
    const observationCount = await this.prisma.observation.count({
      where: { variableId: id },
    });

    if (observationCount > 0) {
      throw new ConflictException(
        `No se puede eliminar la variable porque tiene ${observationCount} observación(es) registrada(s). Los datos históricos deben preservarse.`,
      );
    }

    try {
      await this.prisma.variable.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Variable no encontrada');
      }
      throw error;
    }
  }
}

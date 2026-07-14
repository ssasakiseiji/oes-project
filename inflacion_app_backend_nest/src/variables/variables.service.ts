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
//
// Fase Q: scoped por proyecto. Variable no tiene columna projectId propia
// (se deriva de studyField.projectId) -- por eso cada método valida que el
// studyFieldId recibido pertenezca efectivamente al projectId recibido
// ("chequeo IDOR"), en vez de confiar en que ambos valores enviados por el
// cliente sean consistentes entre sí.
@Injectable()
export class VariablesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStudyFieldInProject(
    studyFieldId: number,
    projectId: number,
  ) {
    const studyField = await this.prisma.studyField.findUnique({
      where: { id: studyFieldId },
      select: { projectId: true },
    });
    if (!studyField || studyField.projectId !== projectId) {
      throw new NotFoundException('Campo de estudio no encontrado');
    }
  }

  async create(dto: CreateVariableDto) {
    await this.assertStudyFieldInProject(dto.studyFieldId, dto.projectId);

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
      select: { dataType: true, studyField: { select: { projectId: true } } },
    });

    if (!existing || existing.studyField?.projectId !== dto.projectId) {
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

    return this.prisma.variable.update({
      where: { id },
      data: {
        name: dto.name,
        unit: dto.unit,
        ...(config !== undefined ? { config } : {}),
      },
    });
  }

  async remove(id: number, projectId: number) {
    const existing = await this.prisma.variable.findUnique({
      where: { id },
      select: { studyField: { select: { projectId: true } } },
    });
    if (!existing || existing.studyField?.projectId !== projectId) {
      throw new NotFoundException('Variable no encontrada');
    }

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

    await this.prisma.variable.delete({ where: { id } });
  }
}

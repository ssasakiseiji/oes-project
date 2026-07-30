import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStudyFieldDto } from './dto/study-field.schema';

// Fase H: renombrado de dominio, Category -> StudyField (port 1:1 de
// categories.service.ts). El chequeo de duplicado se hace a nivel de
// aplicación porque la tabla `study_fields` no tiene un UNIQUE en `name`.
//
// Fase Q: scoped por proyecto -- el duplicado de nombre ahora se chequea
// dentro del proyecto (dos proyectos distintos pueden tener un campo de
// estudio con el mismo nombre), y update/remove verifican ("chequeo IDOR")
// que el registro pertenezca al projectId recibido antes de tocarlo, para
// que un admin del Proyecto A no pueda editar/borrar datos del Proyecto B
// adivinando ids.
//
// Fase Z: create/update pasan a recibir el DTO completo en vez de `name`
// suelto, ahora que hay un segundo campo editable (unitOfMeasure) y sumar
// parámetros posicionales se volvía frágil.
@Injectable()
export class StudyFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(projectId: number) {
    return this.prisma.studyField.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateStudyFieldDto) {
    const { name, unitOfMeasure, projectId } = dto;

    const existing = await this.prisma.studyField.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, projectId },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un campo de estudio con ese nombre en este proyecto',
      );
    }

    return this.prisma.studyField.create({
      data: { name, unitOfMeasure: unitOfMeasure ?? null, projectId },
    });
  }

  async update(id: number, dto: CreateStudyFieldDto) {
    const { name, unitOfMeasure, projectId } = dto;
    const existingRecord = await this.prisma.studyField.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existingRecord || existingRecord.projectId !== projectId) {
      throw new NotFoundException('Campo de estudio no encontrado');
    }

    const duplicate = await this.prisma.studyField.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        projectId,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ya existe otro campo de estudio con ese nombre en este proyecto',
      );
    }

    try {
      return await this.prisma.studyField.update({
        where: { id },
        // unitOfMeasure ausente (undefined) = "no la toques"; null = borrarla
        // explícitamente. Prisma ya distingue undefined de null, así que se
        // pasa tal cual sin normalizar (a diferencia de create, donde no hay
        // valor previo que preservar).
        data: { name, unitOfMeasure },
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

  async remove(id: number, projectId: number) {
    const existingRecord = await this.prisma.studyField.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!existingRecord || existingRecord.projectId !== projectId) {
      throw new NotFoundException('Campo de estudio no encontrado');
    }

    const variableCount = await this.prisma.variable.count({
      where: { studyFieldId: id },
    });

    if (variableCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el campo de estudio porque tiene ${variableCount} variable(s) asociada(s)`,
      );
    }

    await this.prisma.studyField.delete({ where: { id } });
  }
}

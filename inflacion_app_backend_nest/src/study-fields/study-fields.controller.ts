import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { StudyFieldsService } from './study-fields.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createStudyFieldSchema } from './dto/study-field.schema';
import type { CreateStudyFieldDto } from './dto/study-field.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, categories -> study-fields (port 1:1 de
// categories.controller.ts). Lectura para cualquier usuario autenticado,
// escritura solo para admin.
@Controller('study-fields')
@UseGuards(JwtAuthGuard)
export class StudyFieldsController {
  constructor(private readonly studyFieldsService: StudyFieldsService) {}

  @Get()
  findAll() {
    return this.studyFieldsService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(
    @Body(new ZodValidationPipe(createStudyFieldSchema))
    body: CreateStudyFieldDto,
  ) {
    return this.studyFieldsService.create(body.name);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(createStudyFieldSchema))
    body: CreateStudyFieldDto,
  ) {
    return this.studyFieldsService.update(id, body.name);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.studyFieldsService.remove(id);
    return { message: 'Campo de estudio eliminado exitosamente' };
  }
}

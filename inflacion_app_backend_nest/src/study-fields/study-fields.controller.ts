import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudyFieldsService } from './study-fields.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createStudyFieldSchema } from './dto/study-field.schema';
import type { CreateStudyFieldDto } from './dto/study-field.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, categories -> study-fields. Fase Q: scoped
// por proyecto -- lectura para cualquier miembro del proyecto (sin
// @Roles(), ProjectRolesGuard igual exige membership), escritura solo para
// admin del proyecto.
@Controller('study-fields')
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
export class StudyFieldsController {
  constructor(private readonly studyFieldsService: StudyFieldsService) {}

  @Get()
  findAll(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.studyFieldsService.findAll(projectId);
  }

  @Post()
  @Roles('admin')
  create(
    @Body(new ZodValidationPipe(createStudyFieldSchema))
    body: CreateStudyFieldDto,
  ) {
    return this.studyFieldsService.create(body.name, body.projectId);
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(createStudyFieldSchema))
    body: CreateStudyFieldDto,
  ) {
    return this.studyFieldsService.update(id, body.name, body.projectId);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    await this.studyFieldsService.remove(id, projectId);
    return { message: 'Campo de estudio eliminado exitosamente' };
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createProjectSchema, updateProjectSchema } from './dto/project.schema';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';

// Fase P: CRUD de Project queda reservado a 'superadmin' (RolesGuard, no
// ProjectRolesGuard) -- crear/listar/archivar proyectos es una acción de
// plataforma, no algo que dependa de ser miembro de un proyecto en
// particular. `mine` es la excepción: cualquier usuario autenticado puede
// ver sus propias memberships (es lo que alimenta el selector de proyecto
// del frontend, ver ProjectContext en Fase U).
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('mine')
  findMine(@Req() request: RequestWithUser) {
    return this.projectsService.findMine(request.user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  create(
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
    @Req() request: RequestWithUser,
  ) {
    return this.projectsService.create(body, request.user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, body);
  }
}

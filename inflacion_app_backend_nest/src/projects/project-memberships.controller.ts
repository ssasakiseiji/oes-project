import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectMembershipsService } from './project-memberships.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { upsertProjectMembershipSchema } from './dto/project-membership.schema';
import type { UpsertProjectMembershipDto } from './dto/project-membership.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase P: gestión de quién pertenece a un proyecto y con qué rol. Todas las
// rutas requieren ser admin DE ESE PROYECTO (ProjectRolesGuard + admin) --
// un superadmin pasa igual por el bypass de ProjectRolesGuard.
@Controller('project-memberships')
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
@Roles('admin')
export class ProjectMembershipsController {
  constructor(
    private readonly projectMembershipsService: ProjectMembershipsService,
  ) {}

  @Get()
  findByProject(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.projectMembershipsService.findByProject(projectId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(
    @Body(new ZodValidationPipe(upsertProjectMembershipSchema))
    body: UpsertProjectMembershipDto,
  ) {
    return this.projectMembershipsService.upsert(
      body.projectId,
      body.userId,
      body.roles,
    );
  }

  @Delete()
  async remove(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    await this.projectMembershipsService.remove(projectId, userId);
    return { message: 'Membership eliminada exitosamente' };
  }
}

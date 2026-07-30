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
import { ObservationUnitsService } from './observation-units.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { observationUnitSchema } from './dto/observation-unit.schema';
import type { ObservationUnitDto } from './dto/observation-unit.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, commerces -> observation-units. Fase Q:
// scoped por proyecto -- lectura para cualquier miembro del proyecto,
// escritura solo para admin del proyecto.
@Controller('observation-units')
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
export class ObservationUnitsController {
  constructor(
    private readonly observationUnitsService: ObservationUnitsService,
  ) {}

  @Get()
  findAll(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.observationUnitsService.findAll(projectId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.observationUnitsService.findOne(id, projectId);
  }

  @Get(':id/students')
  getStudents(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.observationUnitsService.getStudents(id, projectId);
  }

  @Post()
  @Roles('admin')
  create(
    @Body(new ZodValidationPipe(observationUnitSchema))
    body: ObservationUnitDto,
  ) {
    return this.observationUnitsService.create(
      body.name,
      body.address,
      body.projectId,
    );
  }

  @Put(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(observationUnitSchema))
    body: ObservationUnitDto,
  ) {
    return this.observationUnitsService.update(
      id,
      body.name,
      body.address,
      body.projectId,
    );
  }

  @Delete(':id')
  @Roles('admin')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.observationUnitsService.remove(id, projectId);
  }
}

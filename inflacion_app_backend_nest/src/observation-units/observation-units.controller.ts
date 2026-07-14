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
import { ObservationUnitsService } from './observation-units.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { observationUnitSchema } from './dto/observation-unit.schema';
import type { ObservationUnitDto } from './dto/observation-unit.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, commerces -> observation-units (port 1:1
// de commerces.controller.ts). Lectura para cualquier usuario autenticado,
// escritura solo para admin.
@Controller('observation-units')
@UseGuards(JwtAuthGuard)
export class ObservationUnitsController {
  constructor(
    private readonly observationUnitsService: ObservationUnitsService,
  ) {}

  @Get()
  findAll() {
    return this.observationUnitsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.observationUnitsService.findOne(id);
  }

  @Get(':id/students')
  getStudents(@Param('id', ParseIntPipe) id: number) {
    return this.observationUnitsService.getStudents(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(
    @Body(new ZodValidationPipe(observationUnitSchema))
    body: ObservationUnitDto,
  ) {
    return this.observationUnitsService.create(body.name, body.address);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(observationUnitSchema))
    body: ObservationUnitDto,
  ) {
    return this.observationUnitsService.update(id, body.name, body.address);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.observationUnitsService.remove(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VariablesService } from './variables.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createVariableSchema,
  updateVariableSchema,
} from './dto/variable.schema';
import type {
  CreateVariableDto,
  UpdateVariableDto,
} from './dto/variable.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, products -> variables. Fase Q: además de
// scoped por proyecto, cierra un gap de roles preexistente -- el Express
// original (y el port 1:1 de Fase H) no restringía estas rutas a admin,
// cualquier usuario autenticado (incluso un estudiante) podía crear/editar/
// borrar Variables. Se agrega @Roles('admin') acá porque de todos modos hay
// que tocar este controller para el projectId.
@Controller('variables')
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
@Roles('admin')
export class VariablesController {
  constructor(private readonly variablesService: VariablesService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createVariableSchema)) body: CreateVariableDto,
  ) {
    return this.variablesService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateVariableSchema)) body: UpdateVariableDto,
  ) {
    return this.variablesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    await this.variablesService.remove(id, projectId);
  }
}

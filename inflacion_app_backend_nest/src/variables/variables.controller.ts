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

// Fase H: renombrado de dominio, products -> variables (port 1:1 de
// products.controller.ts). Solo requiere estar autenticado (no hay
// restricción de rol admin, se replica tal cual del Express original).
@Controller('variables')
@UseGuards(JwtAuthGuard)
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.variablesService.remove(id);
  }
}

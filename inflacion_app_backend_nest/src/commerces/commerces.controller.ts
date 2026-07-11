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
import { CommercesService } from './commerces.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { commerceSchema } from './dto/commerce.schema';
import type { CommerceDto } from './dto/commerce.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/commerceRoutes.js: lectura para
// cualquier usuario autenticado, escritura solo para admin.
@Controller('commerces')
@UseGuards(JwtAuthGuard)
export class CommercesController {
  constructor(private readonly commercesService: CommercesService) {}

  @Get()
  findAll() {
    return this.commercesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commercesService.findOne(id);
  }

  @Get(':id/students')
  getStudents(@Param('id', ParseIntPipe) id: number) {
    return this.commercesService.getStudents(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body(new ZodValidationPipe(commerceSchema)) body: CommerceDto) {
    return this.commercesService.create(body.name, body.address);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(commerceSchema)) body: CommerceDto,
  ) {
    return this.commercesService.update(id, body.name, body.address);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.commercesService.remove(id);
  }
}

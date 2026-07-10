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
import { CategoriesService } from './categories.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createCategorySchema } from './dto/category.schema';
import type { CreateCategoryDto } from './dto/category.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/categoryRoutes.js: lectura para
// cualquier usuario autenticado, escritura solo para admin.
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto,
  ) {
    return this.categoriesService.create(body.name);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryDto,
  ) {
    return this.categoriesService.update(id, body.name);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.remove(id);
    return { message: 'Categoría eliminada exitosamente' };
  }
}

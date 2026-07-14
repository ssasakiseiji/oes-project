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
import { ProductsService } from './products.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createProductSchema, updateProductSchema } from './dto/product.schema';
import type { CreateProductDto, UpdateProductDto } from './dto/product.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Port 1:1 de inflacion_app_backend/routes/productRoutes.js: solo requiere
// estar autenticado (no hay restricción de rol admin en el Express actual,
// se replica tal cual).
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ) {
    return this.productsService.create(body.name, body.unit, body.categoryId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    return this.productsService.update(id, body.name, body.unit);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPeriodSchema,
  updatePeriodSchema,
  updatePeriodStatusSchema,
  getAnalysisSchema,
  updatePriceSchema,
  createUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
  updateUserRolesSchema,
} from './dto/admin.schema';
import type {
  CreatePeriodDto,
  UpdatePeriodDto,
  UpdatePeriodStatusDto,
  GetAnalysisDto,
  UpdatePriceDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
  UpdateUserRolesDto,
} from './dto/admin.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/adminRoutes.js: todas las rutas
// requieren admin (router.use(authenticateToken); router.use(authorizeAdmin);
// en el original) y se mantienen "planas" (/api/periods, /api/users, etc.,
// sin prefijo /admin) para que el frontend no necesite cambios.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Periods

  @Get('periods')
  getPeriods() {
    return this.adminService.getPeriods();
  }

  @Post('periods')
  createPeriod(
    @Body(new ZodValidationPipe(createPeriodSchema)) body: CreatePeriodDto,
  ) {
    return this.adminService.createPeriod(body);
  }

  @Put('periods/:id')
  updatePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePeriodSchema)) body: UpdatePeriodDto,
  ) {
    return this.adminService.updatePeriod(id, body);
  }

  @Put('periods/:id/status')
  updatePeriodStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePeriodStatusSchema))
    body: UpdatePeriodStatusDto,
  ) {
    return this.adminService.updatePeriodStatus(id, body.status);
  }

  // Analysis

  @Post('analysis')
  @HttpCode(HttpStatus.OK)
  getAnalysis(
    @Body(new ZodValidationPipe(getAnalysisSchema)) body: GetAnalysisDto,
  ) {
    return this.adminService.getAnalysis(body.periodAId, body.periodBId);
  }

  @Get('historical-data')
  getHistoricalData(
    @Query('productId') productId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.adminService.getHistoricalData(
      productId != null ? Number(productId) : undefined,
      categoryId != null ? Number(categoryId) : undefined,
    );
  }

  // Prices

  @Get('prices')
  getPrices(
    @Query('periodId') periodId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('commerceId') commerceId?: string,
    @Query('showOutliersOnly') showOutliersOnly?: string,
  ) {
    return this.adminService.getPrices({
      periodId: periodId != null ? Number(periodId) : undefined,
      categoryId: categoryId != null ? Number(categoryId) : undefined,
      productId: productId != null ? Number(productId) : undefined,
      userId: userId != null ? Number(userId) : undefined,
      commerceId: commerceId != null ? Number(commerceId) : undefined,
      showOutliersOnly: showOutliersOnly === 'true',
    });
  }

  @Put('prices/:id')
  updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePriceSchema)) body: UpdatePriceDto,
  ) {
    return this.adminService.updatePrice(id, body.price);
  }

  @Delete('prices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrice(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deletePrice(id);
  }

  // Users

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  createUser(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
  ) {
    return this.adminService.createUser(body);
  }

  @Put('users/:userId')
  updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, body);
  }

  @Put('users/:userId/password')
  async updateUserPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserPasswordSchema))
    body: UpdateUserPasswordDto,
  ) {
    return this.adminService.updateUserPassword(userId, body.password);
  }

  @Delete('users/:userId')
  async deleteUser(@Param('userId', ParseIntPipe) userId: number) {
    await this.adminService.deleteUser(userId);
    return { message: 'Usuario eliminado exitosamente' };
  }

  @Post('users/:userId/roles')
  @HttpCode(HttpStatus.OK)
  updateUserRoles(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserRolesSchema))
    body: UpdateUserRolesDto,
  ) {
    return this.adminService.updateUserRoles(userId, body.roles);
  }
}

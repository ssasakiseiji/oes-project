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
  updateObservationSchema,
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
  UpdateObservationDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
  UpdateUserRolesDto,
} from './dto/admin.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio + rutas (/historical-data -> /variable-
// history, /prices -> /observations, más /variable-distribution nueva --
// ver plan de Fase I). Todas las rutas requieren admin y se mantienen
// "planas" (sin prefijo /admin), igual que antes del rename.
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

  @Get('variable-history')
  getVariableHistory(
    @Query('variableId') variableId?: string,
    @Query('studyFieldId') studyFieldId?: string,
  ) {
    return this.adminService.getVariableHistory(
      variableId != null ? Number(variableId) : undefined,
      studyFieldId != null ? Number(studyFieldId) : undefined,
    );
  }

  @Get('variable-distribution')
  getVariableDistribution(
    @Query('variableId', ParseIntPipe) variableId: number,
  ) {
    return this.adminService.getVariableDistribution(variableId);
  }

  // Observations

  @Get('observations')
  getObservations(
    @Query('periodId') periodId?: string,
    @Query('studyFieldId') studyFieldId?: string,
    @Query('variableId') variableId?: string,
    @Query('userId') userId?: string,
    @Query('observationUnitId') observationUnitId?: string,
    @Query('showOutliersOnly') showOutliersOnly?: string,
  ) {
    return this.adminService.getObservations({
      periodId: periodId != null ? Number(periodId) : undefined,
      studyFieldId: studyFieldId != null ? Number(studyFieldId) : undefined,
      variableId: variableId != null ? Number(variableId) : undefined,
      userId: userId != null ? Number(userId) : undefined,
      observationUnitId:
        observationUnitId != null ? Number(observationUnitId) : undefined,
      showOutliersOnly: showOutliersOnly === 'true',
    });
  }

  @Put('observations/:id')
  updateObservation(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateObservationSchema))
    body: UpdateObservationDto,
  ) {
    return this.adminService.updateObservation(id, body.value);
  }

  @Delete('observations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteObservation(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteObservation(id);
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

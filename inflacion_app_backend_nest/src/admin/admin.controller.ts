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
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio + rutas (/historical-data -> /variable-
// history, /prices -> /observations, más /variable-distribution nueva).
// Todas las rutas se mantienen "planas" (sin prefijo /admin).
//
// Fase R: scoped por proyecto -- la mayoría de las rutas pasan a requerir
// ser admin DEL PROYECTO (ProjectRolesGuard + Roles('admin')), excepto un
// subconjunto de rutas de usuarios que quedan superadmin-only (RolesGuard +
// Roles('superadmin')): listar/borrar TODOS los usuarios de la plataforma y
// otorgar el rol 'superadmin' son acciones de plataforma, no de un proyecto
// en particular. Por eso el guard va por método, no a nivel de clase (solo
// JwtAuthGuard es común a todas las rutas).
@Controller()
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Periods

  @Get('periods')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  getPeriods(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.adminService.getPeriods(projectId);
  }

  @Post('periods')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  createPeriod(
    @Body(new ZodValidationPipe(createPeriodSchema)) body: CreatePeriodDto,
  ) {
    return this.adminService.createPeriod(body);
  }

  @Put('periods/:id')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  updatePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePeriodSchema)) body: UpdatePeriodDto,
  ) {
    return this.adminService.updatePeriod(id, body);
  }

  @Put('periods/:id/status')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  updatePeriodStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePeriodStatusSchema))
    body: UpdatePeriodStatusDto,
  ) {
    return this.adminService.updatePeriodStatus(
      id,
      body.status,
      body.projectId,
    );
  }

  // Analysis

  @Post('analysis')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  getAnalysis(
    @Body(new ZodValidationPipe(getAnalysisSchema)) body: GetAnalysisDto,
  ) {
    return this.adminService.getAnalysis(
      body.projectId,
      body.periodAId,
      body.periodBId,
    );
  }

  @Get('variable-history')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  getVariableHistory(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('variableId') variableId?: string,
    @Query('studyFieldId') studyFieldId?: string,
  ) {
    return this.adminService.getVariableHistory(
      projectId,
      variableId != null ? Number(variableId) : undefined,
      studyFieldId != null ? Number(studyFieldId) : undefined,
    );
  }

  @Get('variable-distribution')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  getVariableDistribution(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('variableId', ParseIntPipe) variableId: number,
  ) {
    return this.adminService.getVariableDistribution(projectId, variableId);
  }

  // Observations

  @Get('observations')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  getObservations(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('periodId') periodId?: string,
    @Query('studyFieldId') studyFieldId?: string,
    @Query('variableId') variableId?: string,
    @Query('userId') userId?: string,
    @Query('observationUnitId') observationUnitId?: string,
    @Query('showOutliersOnly') showOutliersOnly?: string,
  ) {
    return this.adminService.getObservations({
      projectId,
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
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  updateObservation(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateObservationSchema))
    body: UpdateObservationDto,
  ) {
    return this.adminService.updateObservation(id, body.value, body.projectId);
  }

  @Delete('observations/:id')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteObservation(
    @Param('id', ParseIntPipe) id: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    await this.adminService.deleteObservation(id, projectId);
  }

  // Users

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  createUser(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto,
  ) {
    return this.adminService.createUser(body);
  }

  @Put('users/:userId')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, body);
  }

  @Put('users/:userId/password')
  @UseGuards(ProjectRolesGuard)
  @Roles('admin')
  async updateUserPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserPasswordSchema))
    body: UpdateUserPasswordDto,
  ) {
    return this.adminService.updateUserPassword(
      userId,
      body.password,
      body.projectId,
    );
  }

  @Delete('users/:userId')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  async deleteUser(@Param('userId', ParseIntPipe) userId: number) {
    await this.adminService.deleteUser(userId);
    return { message: 'Usuario eliminado exitosamente' };
  }

  @Post('users/:userId/roles')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  @HttpCode(HttpStatus.OK)
  updateUserRoles(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ZodValidationPipe(updateUserRolesSchema))
    body: UpdateUserRolesDto,
  ) {
    return this.adminService.updateUserRoles(userId, body.roles);
  }
}

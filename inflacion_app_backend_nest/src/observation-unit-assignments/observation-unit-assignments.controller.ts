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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ObservationUnitAssignmentsService } from './observation-unit-assignments.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  assignObservationUnitsToStudentSchema,
  bulkAssignObservationUnitsSchema,
  assignObservationUnitToStudentsSchema,
} from './dto/observation-unit-assignment.schema';
import type {
  AssignObservationUnitsToStudentDto,
  BulkAssignObservationUnitsDto,
  AssignObservationUnitToStudentsDto,
} from './dto/observation-unit-assignment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, commerce-assignments -> observation-unit-
// assignments (port 1:1 de commerce-assignments.controller.ts). Todas las
// rutas requieren admin.
@Controller('observation-unit-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ObservationUnitAssignmentsController {
  constructor(
    private readonly observationUnitAssignmentsService: ObservationUnitAssignmentsService,
  ) {}

  @Get('students')
  getStudentsWithAssignments() {
    return this.observationUnitAssignmentsService.getStudentsWithAssignments();
  }

  @Get('student/:studentId')
  getStudentAssignments(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.observationUnitAssignmentsService.getStudentAssignments(
      studentId,
    );
  }

  @Post('student/:studentId')
  @HttpCode(HttpStatus.OK)
  async assignObservationUnitsToStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body(new ZodValidationPipe(assignObservationUnitsToStudentSchema))
    body: AssignObservationUnitsToStudentDto,
    @Req() request: RequestWithUser,
  ) {
    const assignments =
      await this.observationUnitAssignmentsService.assignObservationUnitsToStudent(
        studentId,
        body.observationUnitIds,
        request.user.id,
      );

    return {
      message: 'Unidades de observación asignadas exitosamente',
      assignments,
    };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkAssignObservationUnits(
    @Body(new ZodValidationPipe(bulkAssignObservationUnitsSchema))
    body: BulkAssignObservationUnitsDto,
    @Req() request: RequestWithUser,
  ) {
    await this.observationUnitAssignmentsService.bulkAssignObservationUnits(
      body.studentIds,
      body.observationUnitIds,
      request.user.id,
    );

    return {
      message: `Unidades de observación asignadas a ${body.studentIds.length} estudiante(s) exitosamente`,
    };
  }

  @Get('summary')
  getAssignmentsSummary() {
    return this.observationUnitAssignmentsService.getAssignmentsSummary();
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  async assignObservationUnitToStudents(
    @Body(new ZodValidationPipe(assignObservationUnitToStudentsSchema))
    body: AssignObservationUnitToStudentsDto,
    @Req() request: RequestWithUser,
  ) {
    const result =
      await this.observationUnitAssignmentsService.assignObservationUnitToStudents(
        body.observationUnitId,
        body.studentIds,
        request.user.id,
      );

    return {
      message: `Unidad de observación asignada a ${result.assigned} estudiante(s) exitosamente`,
      ...result,
    };
  }

  @Delete('student/:studentId/observation-unit/:observationUnitId')
  async removeAssignment(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('observationUnitId', ParseIntPipe) observationUnitId: number,
  ) {
    await this.observationUnitAssignmentsService.removeAssignment(
      studentId,
      observationUnitId,
    );
    return { message: 'Asignación eliminada exitosamente' };
  }
}

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
  Query,
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
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fase H: renombrado de dominio, commerce-assignments -> observation-unit-
// assignments. Fase Q: scoped por proyecto, todas las rutas requieren admin
// DE ESE PROYECTO.
@Controller('observation-unit-assignments')
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
@Roles('admin')
export class ObservationUnitAssignmentsController {
  constructor(
    private readonly observationUnitAssignmentsService: ObservationUnitAssignmentsService,
  ) {}

  @Get('students')
  getStudentsWithAssignments(
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.observationUnitAssignmentsService.getStudentsWithAssignments(
      projectId,
    );
  }

  @Get('student/:studentId')
  getStudentAssignments(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.observationUnitAssignmentsService.getStudentAssignments(
      studentId,
      projectId,
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
        body.projectId,
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
      body.projectId,
    );

    return {
      message: `Unidades de observación asignadas a ${body.studentIds.length} estudiante(s) exitosamente`,
    };
  }

  @Get('summary')
  getAssignmentsSummary(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.observationUnitAssignmentsService.getAssignmentsSummary(
      projectId,
    );
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
        body.projectId,
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
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    await this.observationUnitAssignmentsService.removeAssignment(
      studentId,
      observationUnitId,
      projectId,
    );
    return { message: 'Asignación eliminada exitosamente' };
  }
}

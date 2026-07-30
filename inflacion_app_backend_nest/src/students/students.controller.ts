import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  saveDraftSchema,
  submitObservationsSchema,
} from './dto/student.schema';
import type { SaveDraftDto, SubmitObservationsDto } from './dto/student.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { CollectionPeriodGuard } from '../common/guards/collection-period.guard';
import type { RequestWithActivePeriod } from '../common/guards/collection-period.guard';

// Fase H/I: renombrado de dominio + rutas nuevas (/draft-observations,
// /observations en vez de /save-draft, /submit-prices). Las rutas se
// mantienen "planas" (sin prefijo /students).
//
// Fase S: scoped por proyecto. `student-tasks`/`student/dashboard` usan
// ProjectRolesGuard SIN @Roles() (solo exige membership, cualquier rol) --
// estas rutas también las consume UI de admin (VariablesManager,
// ObservationsManager, AnalysisView reusan /student-tasks como catálogo
// barato), así que exigir rol 'student' rompería esas pantallas. Las rutas
// de escritura (draft-observations/observations) NO reciben projectId del
// cliente -- lo deriva CollectionPeriodGuard a partir del observationUnitId
// ya enviado (ver ese guard).
@Controller()
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('student-tasks')
  @UseGuards(ProjectRolesGuard)
  getStudentTasks(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Req() request: RequestWithActivePeriod,
  ) {
    return this.studentsService.getStudentTasks(request.user.id, projectId);
  }

  @Get('student/dashboard')
  @UseGuards(ProjectRolesGuard)
  getStudentDashboard(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Req() request: RequestWithActivePeriod,
  ) {
    return this.studentsService.getStudentDashboard(request.user.id, projectId);
  }

  @Post('draft-observations')
  @UseGuards(CollectionPeriodGuard)
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Body(new ZodValidationPipe(saveDraftSchema)) body: SaveDraftDto,
    @Req() request: RequestWithActivePeriod,
  ) {
    await this.studentsService.saveDraft(
      request.user.id,
      body.observationUnitId,
      request.activePeriodId,
      request.activeProjectId,
      body.values,
    );
    return { message: 'Borrador guardado con éxito' };
  }

  @Post('observations')
  @UseGuards(CollectionPeriodGuard)
  async submitObservations(
    @Body(new ZodValidationPipe(submitObservationsSchema))
    body: SubmitObservationsDto,
    @Req() request: RequestWithActivePeriod,
  ) {
    await this.studentsService.submitObservations(
      request.user.id,
      request.activePeriodId,
      body.observationUnitId,
      request.activeProjectId,
      body.values,
    );
    return { message: '¡Registro completado con éxito!' };
  }
}

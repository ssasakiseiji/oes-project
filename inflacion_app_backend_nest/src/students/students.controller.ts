import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { CollectionPeriodGuard } from '../common/guards/collection-period.guard';
import type { RequestWithActivePeriod } from '../common/guards/collection-period.guard';

// Fase H/I: renombrado de dominio + rutas nuevas (/draft-observations,
// /observations en vez de /save-draft, /submit-prices -- ver plan de
// Fase I, no hay consumidores externos de la API así que es seguro
// renombrarlas). Las rutas se mantienen "planas" (sin prefijo /students).
@Controller()
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('student-tasks')
  getStudentTasks(@Req() request: RequestWithUser) {
    return this.studentsService.getStudentTasks(request.user.id);
  }

  @Get('student/dashboard')
  getStudentDashboard(@Req() request: RequestWithUser) {
    return this.studentsService.getStudentDashboard(request.user.id);
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
      body.values,
    );
    return { message: '¡Registro completado con éxito!' };
  }
}

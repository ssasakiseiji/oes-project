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
import { saveDraftSchema, submitPricesSchema } from './dto/student.schema';
import type { SaveDraftDto, SubmitPricesDto } from './dto/student.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { CollectionPeriodGuard } from '../common/guards/collection-period.guard';
import type { RequestWithActivePeriod } from '../common/guards/collection-period.guard';

// Port 1:1 de inflacion_app_backend/routes/studentRoutes.js: las rutas se
// mantienen "planas" (sin prefijo /students) para que el frontend, que las
// llama como /api/student-tasks, /api/student/dashboard, /api/save-draft y
// /api/submit-prices, no necesite cambios al hacer el corte.
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

  @Post('save-draft')
  @UseGuards(CollectionPeriodGuard)
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Body(new ZodValidationPipe(saveDraftSchema)) body: SaveDraftDto,
    @Req() request: RequestWithActivePeriod,
  ) {
    await this.studentsService.saveDraft(
      request.user.id,
      body.commerceId,
      request.activePeriodId,
      body.prices,
    );
    return { message: 'Borrador guardado con éxito' };
  }

  @Post('submit-prices')
  @UseGuards(CollectionPeriodGuard)
  async submitPrices(
    @Body(new ZodValidationPipe(submitPricesSchema)) body: SubmitPricesDto,
    @Req() request: RequestWithActivePeriod,
  ) {
    await this.studentsService.submitPrices(
      request.user.id,
      request.activePeriodId,
      body,
    );
    return { message: '¡Registro completado con éxito!' };
  }
}

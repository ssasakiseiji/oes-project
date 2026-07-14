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
import { CommerceAssignmentsService } from './commerce-assignments.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  assignCommercesToStudentSchema,
  bulkAssignCommercesSchema,
  assignCommerceToStudentsSchema,
} from './dto/commerce-assignment.schema';
import type {
  AssignCommercesToStudentDto,
  BulkAssignCommercesDto,
  AssignCommerceToStudentsDto,
} from './dto/commerce-assignment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/commerceAssignmentRoutes.js: todas
// las rutas requieren admin (igual que el router.use(authorizeAdmin) global
// del archivo original).
@Controller('commerce-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CommerceAssignmentsController {
  constructor(
    private readonly commerceAssignmentsService: CommerceAssignmentsService,
  ) {}

  @Get('students')
  getStudentsWithAssignments() {
    return this.commerceAssignmentsService.getStudentsWithAssignments();
  }

  @Get('student/:studentId')
  getStudentAssignments(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.commerceAssignmentsService.getStudentAssignments(studentId);
  }

  @Post('student/:studentId')
  @HttpCode(HttpStatus.OK)
  async assignCommercesToStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body(new ZodValidationPipe(assignCommercesToStudentSchema))
    body: AssignCommercesToStudentDto,
    @Req() request: RequestWithUser,
  ) {
    const assignments =
      await this.commerceAssignmentsService.assignCommercesToStudent(
        studentId,
        body.commerceIds,
        request.user.id,
      );

    return { message: 'Comercios asignados exitosamente', assignments };
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkAssignCommerces(
    @Body(new ZodValidationPipe(bulkAssignCommercesSchema))
    body: BulkAssignCommercesDto,
    @Req() request: RequestWithUser,
  ) {
    await this.commerceAssignmentsService.bulkAssignCommerces(
      body.studentIds,
      body.commerceIds,
      request.user.id,
    );

    return {
      message: `Comercios asignados a ${body.studentIds.length} estudiante(s) exitosamente`,
    };
  }

  @Get('summary')
  getAssignmentsSummary() {
    return this.commerceAssignmentsService.getAssignmentsSummary();
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  async assignCommerceToStudents(
    @Body(new ZodValidationPipe(assignCommerceToStudentsSchema))
    body: AssignCommerceToStudentsDto,
    @Req() request: RequestWithUser,
  ) {
    const result =
      await this.commerceAssignmentsService.assignCommerceToStudents(
        body.commerceId,
        body.studentIds,
        request.user.id,
      );

    return {
      message: `Comercio asignado a ${result.assigned} estudiante(s) exitosamente`,
      ...result,
    };
  }

  @Delete('student/:studentId/commerce/:commerceId')
  async removeAssignment(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('commerceId', ParseIntPipe) commerceId: number,
  ) {
    await this.commerceAssignmentsService.removeAssignment(
      studentId,
      commerceId,
    );
    return { message: 'Asignación eliminada exitosamente' };
  }
}

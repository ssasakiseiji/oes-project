import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/monitorRoutes.js: ruta plana
// (/api/monitor-data) para que el frontend no necesite cambios.
//
// Fase S: scoped por proyecto -- ProjectRolesGuard reemplaza a RolesGuard
// (la elevación "monitor" también admite 'admin' se preserva, es la misma
// regla que ya tenía RolesGuard).
@Controller()
@UseGuards(JwtAuthGuard, ProjectRolesGuard)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('monitor-data')
  @Roles('monitor')
  getMonitorData(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.monitorService.getMonitorData(projectId);
  }
}

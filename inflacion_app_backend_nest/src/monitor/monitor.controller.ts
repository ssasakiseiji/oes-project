import { Controller, Get, UseGuards } from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Port 1:1 de inflacion_app_backend/routes/monitorRoutes.js: ruta plana
// (/api/monitor-data) para que el frontend no necesite cambios.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('monitor-data')
  @Roles('monitor')
  getMonitorData() {
    return this.monitorService.getMonitorData();
  }
}

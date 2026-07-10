import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): string {
    return '<h1>🚀 Backend NestJS de InflaciónApp está en línea y conectado a PostgreSQL!</h1>';
  }
}

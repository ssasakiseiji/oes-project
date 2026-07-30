import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { StudyFieldsModule } from './study-fields/study-fields.module';
import { VariablesModule } from './variables/variables.module';
import { ObservationUnitsModule } from './observation-units/observation-units.module';
import { ObservationUnitAssignmentsModule } from './observation-unit-assignments/observation-unit-assignments.module';
import { StudentsModule } from './students/students.module';
import { MonitorModule } from './monitor/monitor.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    StudyFieldsModule,
    VariablesModule,
    ObservationUnitsModule,
    ObservationUnitAssignmentsModule,
    StudentsModule,
    MonitorModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ObservationUnitAssignmentsController } from './observation-unit-assignments.controller';
import { ObservationUnitAssignmentsService } from './observation-unit-assignments.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [ObservationUnitAssignmentsController],
  providers: [ObservationUnitAssignmentsService],
})
export class ObservationUnitAssignmentsModule {}

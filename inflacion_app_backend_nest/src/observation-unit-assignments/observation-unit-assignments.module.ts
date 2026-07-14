import { Module } from '@nestjs/common';
import { ObservationUnitAssignmentsController } from './observation-unit-assignments.controller';
import { ObservationUnitAssignmentsService } from './observation-unit-assignments.service';

@Module({
  controllers: [ObservationUnitAssignmentsController],
  providers: [ObservationUnitAssignmentsService],
})
export class ObservationUnitAssignmentsModule {}

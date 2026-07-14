import { Module } from '@nestjs/common';
import { ObservationUnitsController } from './observation-units.controller';
import { ObservationUnitsService } from './observation-units.service';

@Module({
  controllers: [ObservationUnitsController],
  providers: [ObservationUnitsService],
})
export class ObservationUnitsModule {}

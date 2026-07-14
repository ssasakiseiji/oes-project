import { Module } from '@nestjs/common';
import { CommerceAssignmentsController } from './commerce-assignments.controller';
import { CommerceAssignmentsService } from './commerce-assignments.service';

@Module({
  controllers: [CommerceAssignmentsController],
  providers: [CommerceAssignmentsService],
})
export class CommerceAssignmentsModule {}

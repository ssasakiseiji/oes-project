import { Module } from '@nestjs/common';
import { StudyFieldsController } from './study-fields.controller';
import { StudyFieldsService } from './study-fields.service';

@Module({
  controllers: [StudyFieldsController],
  providers: [StudyFieldsService],
})
export class StudyFieldsModule {}

import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembershipsController } from './project-memberships.controller';
import { ProjectMembershipsService } from './project-memberships.service';

@Module({
  controllers: [ProjectsController, ProjectMembershipsController],
  providers: [ProjectsService, ProjectMembershipsService],
  exports: [ProjectMembershipsService],
})
export class ProjectsModule {}

import { Module } from '@nestjs/common';
import { RoadmapsController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';
import { WorkItemsController } from './work-items.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  controllers: [RoadmapsController, WorkItemsController],
  providers: [RoadmapsService, WorkItemsService],
  exports: [RoadmapsService],
})
export class RoadmapsModule {}

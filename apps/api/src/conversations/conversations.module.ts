import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { PrdsModule } from '../prds/prds.module';
import { RoadmapsModule } from '../roadmaps/roadmaps.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [CompanyModule, PrdsModule, RoadmapsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}

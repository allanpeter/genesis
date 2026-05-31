import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { BusinessContextService } from './business-context.service';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [KnowledgeModule],
  controllers: [CompanyController],
  providers: [CompanyService, BusinessContextService],
  exports: [BusinessContextService],
})
export class CompanyModule {}

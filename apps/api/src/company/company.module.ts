import { Module } from '@nestjs/common';
import { BusinessContextService } from './business-context.service';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, BusinessContextService],
  exports: [BusinessContextService],
})
export class CompanyModule {}

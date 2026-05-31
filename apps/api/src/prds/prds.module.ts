import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { PrdsController } from './prds.controller';
import { PrdsService } from './prds.service';

@Module({
  imports: [CompanyModule],
  controllers: [PrdsController],
  providers: [PrdsService],
  exports: [PrdsService],
})
export class PrdsModule {}

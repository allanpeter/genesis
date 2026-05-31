import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  companyProfileSchema,
  type AuthUser,
  type CompanyProfileInput,
} from '@genesis/shared';
import type { CompanyProfile } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CompanyService } from './company.service';

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser): Promise<CompanyProfile | null> {
    return this.company.getProfile(user.organizationId);
  }

  @Put('profile')
  @Roles('ADMIN')
  upsertProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(companyProfileSchema)) body: CompanyProfileInput,
  ): Promise<CompanyProfile> {
    return this.company.upsertProfile(user.organizationId, body);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createPrdSchema,
  generatePrdSchema,
  newPrdVersionSchema,
  paginationQuerySchema,
  type AuthUser,
  type CreatePrdInput,
  type GeneratePrdInput,
  type NewPrdVersionInput,
  type PaginationQuery,
} from '@genesis/shared';
import type { Prd, PrdVersion } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrdsService } from './prds.service';

@ApiTags('prds')
@ApiBearerAuth()
@Controller('prds')
export class PrdsController {
  constructor(private readonly prds: PrdsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.prds.list(user.organizationId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prds.getById(user.organizationId, id);
  }

  @Post()
  @Roles('MEMBER')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPrdSchema)) body: CreatePrdInput,
  ): Promise<Prd> {
    return this.prds.create(user.organizationId, body);
  }

  @Post(':id/versions')
  @Roles('MEMBER')
  addVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(newPrdVersionSchema)) body: NewPrdVersionInput,
  ): Promise<PrdVersion> {
    return this.prds.addVersion(user.organizationId, id, body);
  }

  @Post('generate')
  @Roles('MEMBER')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generatePrdSchema)) body: GeneratePrdInput,
  ): Promise<Prd> {
    return this.prds.generateFromIdea(user.organizationId, body);
  }
}

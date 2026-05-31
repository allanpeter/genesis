import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createKnowledgeDocSchema,
  paginationQuerySchema,
  type AuthUser,
  type CreateKnowledgeDocInput,
  type PaginationQuery,
} from '@genesis/shared';
import type { KnowledgeDocument } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.knowledge.list(user.organizationId, query);
  }

  @Post()
  @Roles('MEMBER')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createKnowledgeDocSchema)) body: CreateKnowledgeDocInput,
  ): Promise<KnowledgeDocument> {
    return this.knowledge.create(user.organizationId, body);
  }

  @Delete(':id')
  @Roles('MEMBER')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.knowledge.remove(user.organizationId, id);
  }
}

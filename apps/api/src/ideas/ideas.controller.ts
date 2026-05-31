import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createIdeaSchema,
  paginationQuerySchema,
  updateIdeaSchema,
  type AuthUser,
  type CreateIdeaInput,
  type Paginated,
  type PaginationQuery,
  type UpdateIdeaInput,
} from '@genesis/shared';
import type { Idea } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IdeasService } from './ideas.service';

@ApiTags('ideas')
@ApiBearerAuth()
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ): Promise<Paginated<Idea>> {
    return this.ideas.list(user.organizationId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Idea> {
    return this.ideas.getById(user.organizationId, id);
  }

  @Post()
  @Roles('MEMBER')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createIdeaSchema)) body: CreateIdeaInput,
  ): Promise<Idea> {
    return this.ideas.create(user.organizationId, body);
  }

  @Patch(':id')
  @Roles('MEMBER')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIdeaSchema)) body: UpdateIdeaInput,
  ): Promise<Idea> {
    return this.ideas.update(user.organizationId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ideas.remove(user.organizationId, id);
  }
}

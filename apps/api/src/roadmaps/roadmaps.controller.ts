import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  generateRoadmapSchema,
  paginationQuerySchema,
  type AuthUser,
  type GenerateRoadmapInput,
  type PaginationQuery,
} from '@genesis/shared';
import type { Roadmap } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RoadmapsService } from './roadmaps.service';

const createRoadmapSchema = z.object({
  title: z.string().min(3).max(200),
  workspaceId: z.string().cuid().optional(),
  prdId: z.string().cuid().optional(),
});
type CreateRoadmapInput = z.infer<typeof createRoadmapSchema>;

@ApiTags('roadmaps')
@ApiBearerAuth()
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmaps: RoadmapsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.roadmaps.list(user.organizationId, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.roadmaps.getById(user.organizationId, id);
  }

  @Post()
  @Roles('MEMBER')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createRoadmapSchema)) body: CreateRoadmapInput,
  ): Promise<Roadmap> {
    return this.roadmaps.create(user.organizationId, body.title, body.workspaceId, body.prdId);
  }

  @Post('generate')
  @Roles('MEMBER')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generateRoadmapSchema)) body: GenerateRoadmapInput,
  ): Promise<Roadmap> {
    return this.roadmaps.generateFromPrd(user.organizationId, body);
  }
}

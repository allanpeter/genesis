import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createAgentSchema,
  updateAgentSchema,
  type CreateAgentInput,
  type UpdateAgentInput,
} from '@genesis/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthUser } from '@genesis/shared';
import { AgentsService } from './agents.service';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.agents.listAll(user.organizationId);
  }

  @Get('tree')
  tree(@CurrentUser() user: AuthUser) {
    return this.agents.listTree(user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.getById(user.organizationId, id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAgentSchema)) body: CreateAgentInput,
  ) {
    return this.agents.create(user.organizationId, body);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: UpdateAgentInput,
  ) {
    return this.agents.update(user.organizationId, id, body);
  }

  @Patch(':id/toggle')
  @Roles('ADMIN')
  toggle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.toggle(user.organizationId, id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.agents.remove(user.organizationId, id);
  }
}

import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createWorkItemSchema,
  moveWorkItemSchema,
  updateWorkItemSchema,
  type AuthUser,
  type CreateWorkItemInput,
  type MoveWorkItemInput,
  type UpdateWorkItemInput,
} from '@genesis/shared';
import type { WorkItem } from '@genesis/db';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WorkItemsService } from './work-items.service';

@ApiTags('work-items')
@ApiBearerAuth()
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItems: WorkItemsService) {}

  @Post()
  @Roles('MEMBER')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWorkItemSchema)) body: CreateWorkItemInput,
  ): Promise<WorkItem> {
    return this.workItems.create(user.organizationId, body);
  }

  @Patch(':id')
  @Roles('MEMBER')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkItemSchema)) body: UpdateWorkItemInput,
  ): Promise<WorkItem> {
    return this.workItems.update(user.organizationId, id, body);
  }

  @Patch(':id/move')
  @Roles('MEMBER')
  move(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveWorkItemSchema)) body: MoveWorkItemInput,
  ): Promise<WorkItem> {
    return this.workItems.move(user.organizationId, id, body);
  }

  @Delete(':id')
  @Roles('MEMBER')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workItems.remove(user.organizationId, id);
  }
}

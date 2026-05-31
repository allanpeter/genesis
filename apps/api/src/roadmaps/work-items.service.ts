import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateWorkItemInput,
  MoveWorkItemInput,
  UpdateWorkItemInput,
} from '@genesis/shared';
import type { WorkItem } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

/** Operações de WorkItem para o Kanban/backlog. Tudo escopado por organizationId. */
@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(orgId: string, id: string): Promise<WorkItem> {
    const item = await this.prisma.workItem.findFirst({ where: { id, organizationId: orgId } });
    if (!item) throw new NotFoundException('Work item não encontrado.');
    return item;
  }

  create(orgId: string, input: CreateWorkItemInput): Promise<WorkItem> {
    return this.prisma.workItem.create({
      data: {
        organizationId: orgId,
        workspaceId: input.workspaceId ?? null,
        roadmapId: input.roadmapId ?? null,
        parentId: input.parentId ?? null,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        estimatePoints: input.estimatePoints ?? null,
      },
    });
  }

  async update(orgId: string, id: string, input: UpdateWorkItemInput): Promise<WorkItem> {
    await this.getById(orgId, id);
    return this.prisma.workItem.update({ where: { id }, data: input });
  }

  /** Move um card no Kanban: muda status e posição. */
  async move(orgId: string, id: string, input: MoveWorkItemInput): Promise<WorkItem> {
    await this.getById(orgId, id);
    return this.prisma.workItem.update({
      where: { id },
      data: { status: input.status, position: input.position },
    });
  }

  async remove(orgId: string, id: string): Promise<{ id: string }> {
    await this.getById(orgId, id);
    await this.prisma.workItem.delete({ where: { id } });
    return { id };
  }
}

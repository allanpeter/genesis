import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateKnowledgeDocInput, Paginated, PaginationQuery } from '@genesis/shared';
import type { KnowledgeDocument } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

/** Base de conhecimento (memória organizacional). Escopado por organizationId. */
@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: PaginationQuery): Promise<Paginated<KnowledgeDocument>> {
    const { page, pageSize } = query;
    const [data, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.knowledgeDocument.count({ where: { organizationId: orgId } }),
    ]);
    return { data, total, page, pageSize };
  }

  create(orgId: string, input: CreateKnowledgeDocInput): Promise<KnowledgeDocument> {
    return this.prisma.knowledgeDocument.create({
      data: {
        organizationId: orgId,
        workspaceId: input.workspaceId ?? null,
        title: input.title,
        type: input.type,
        content: input.content,
      },
    });
  }

  async remove(orgId: string, id: string): Promise<{ id: string }> {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { id };
  }
}

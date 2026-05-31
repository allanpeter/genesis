import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CreateKnowledgeDocInput, Paginated, PaginationQuery } from '@genesis/shared';
import type { KnowledgeDocument } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag.service';

/** Base de conhecimento (memória organizacional). Escopado por organizationId. */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
  ) {}

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

  async create(orgId: string, input: CreateKnowledgeDocInput): Promise<KnowledgeDocument> {
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: orgId,
        workspaceId: input.workspaceId ?? null,
        title: input.title,
        type: input.type,
        content: input.content,
      },
    });
    // Indexação assíncrona: não bloqueia a resposta HTTP
    this.rag.indexDocument(orgId, doc.id).catch((err) =>
      this.logger.error(`Falha ao indexar doc ${doc.id}:`, (err as Error).message),
    );
    return doc;
  }

  async remove(orgId: string, id: string): Promise<{ id: string }> {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    await this.rag.deleteDocument(orgId, id);
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { id };
  }
}

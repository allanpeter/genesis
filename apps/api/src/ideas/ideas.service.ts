import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateIdeaInput, Paginated, PaginationQuery, UpdateIdeaInput } from '@genesis/shared';
import type { Idea } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CRUD de ideias. TODAS as queries são filtradas por organizationId
 * (isolamento de tenant) — nunca confie em ids vindos do cliente sem o escopo.
 */
@Injectable()
export class IdeasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, query: PaginationQuery): Promise<Paginated<Idea>> {
    const { page, pageSize } = query;
    const [data, total] = await Promise.all([
      this.prisma.idea.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.idea.count({ where: { organizationId: orgId } }),
    ]);
    return { data, total, page, pageSize };
  }

  async getById(orgId: string, id: string): Promise<Idea> {
    const idea = await this.prisma.idea.findFirst({ where: { id, organizationId: orgId } });
    if (!idea) throw new NotFoundException('Ideia não encontrada.');
    return idea;
  }

  create(orgId: string, input: CreateIdeaInput): Promise<Idea> {
    return this.prisma.idea.create({ data: { ...input, organizationId: orgId } });
  }

  async update(orgId: string, id: string, input: UpdateIdeaInput): Promise<Idea> {
    await this.getById(orgId, id); // garante escopo do tenant
    return this.prisma.idea.update({ where: { id }, data: input });
  }

  async remove(orgId: string, id: string): Promise<{ id: string }> {
    await this.getById(orgId, id);
    await this.prisma.idea.delete({ where: { id } });
    return { id };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { loadAgent, listAgentSlugs } from '@genesis/ai';
import type { CreateAgentInput, UpdateAgentInput } from '@genesis/shared';
import type { Agent } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentListItem {
  id: string | null;
  slug: string;
  name: string;
  role: string | null;
  model: string;
  provider: string;
  instructions: string | null;
  isActive: boolean;
  isBuiltin: boolean;
  hasOverride: boolean;
  parentId: string | null;
}

export interface AgentTreeNode extends AgentListItem {
  children: AgentTreeNode[];
}

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(orgId: string): Promise<AgentListItem[]> {
    const builtinSlugs = listAgentSlugs();
    const dbAgents = await this.prisma.agent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });

    const dbBySlug = new Map(dbAgents.map((a) => [a.name, a]));

    const builtins: AgentListItem[] = builtinSlugs.map((slug) => {
      const def = loadAgent(slug)!;
      const override = dbBySlug.get(slug);
      return {
        id: override?.id ?? null,
        slug,
        name: override?.name ?? def.name,
        role: override?.role ?? def.role,
        model: override?.model ?? def.model,
        provider: override?.provider ?? 'ANTHROPIC',
        instructions: override?.instructions ?? null,
        isActive: override?.isActive ?? true,
        isBuiltin: true,
        hasOverride: !!override,
        parentId: override?.parentId ?? null,
      };
    });

    const customAgents: AgentListItem[] = dbAgents
      .filter((a) => !builtinSlugs.includes(a.name))
      .map((a) => ({
        id: a.id,
        slug: a.id,
        name: a.name,
        role: a.role ?? null,
        model: a.model,
        provider: a.provider,
        instructions: a.instructions ?? null,
        isActive: a.isActive,
        isBuiltin: false,
        hasOverride: false,
        parentId: a.parentId ?? null,
      }));

    return [...builtins, ...customAgents];
  }

  async listTree(orgId: string): Promise<AgentTreeNode[]> {
    const flat = await this.listAll(orgId);
    return this.buildTree(flat, null);
  }

  private buildTree(nodes: AgentListItem[], parentId: string | null): AgentTreeNode[] {
    return nodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .map((n) => ({ ...n, children: n.id ? this.buildTree(nodes, n.id) : [] }));
  }

  async getById(orgId: string, id: string): Promise<Agent> {
    const agent = await this.prisma.agent.findFirst({ where: { id, organizationId: orgId } });
    if (!agent) throw new NotFoundException('Agente não encontrado.');
    return agent;
  }

  async create(orgId: string, input: CreateAgentInput): Promise<Agent> {
    const builtinSlugs = listAgentSlugs();
    const isOverride = builtinSlugs.includes(input.name);

    const data = {
      role: input.role,
      model: input.model ?? 'claude-opus-4-8',
      provider: (input.provider as never) ?? 'ANTHROPIC',
      instructions: input.instructions,
      isActive: input.isActive ?? true,
      parentId: input.parentId ?? null,
    };

    if (isOverride) {
      return this.prisma.agent.upsert({
        where: { organizationId_name: { organizationId: orgId, name: input.name } },
        update: data,
        create: { organizationId: orgId, name: input.name, ...data },
      });
    }

    return this.prisma.agent.create({
      data: { organizationId: orgId, name: input.name, ...data },
    });
  }

  async update(orgId: string, id: string, input: UpdateAgentInput): Promise<Agent> {
    await this.getById(orgId, id);
    return this.prisma.agent.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.provider !== undefined && { provider: input.provider as never }),
        ...(input.instructions !== undefined && { instructions: input.instructions }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...('parentId' in input && { parentId: input.parentId ?? null }),
      },
    });
  }

  async toggle(orgId: string, id: string): Promise<Agent> {
    const agent = await this.getById(orgId, id);
    return this.prisma.agent.update({
      where: { id },
      data: { isActive: !agent.isActive },
    });
  }

  async remove(orgId: string, id: string): Promise<void> {
    const agent = await this.prisma.agent.findFirst({ where: { id, organizationId: orgId } });
    if (!agent) throw new NotFoundException('Agente não encontrado.');
    await this.prisma.agent.delete({ where: { id } });
  }
}

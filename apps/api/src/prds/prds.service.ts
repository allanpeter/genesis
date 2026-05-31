import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { extractJson } from '@genesis/ai';
import {
  prdContentSchema,
  type CreatePrdInput,
  type GeneratePrdInput,
  type NewPrdVersionInput,
  type Paginated,
  type PaginationQuery,
  type PrdContent,
} from '@genesis/shared';
import type { Idea, Prd, PrdVersion } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BusinessContextService } from '../company/business-context.service';

/**
 * PRDs com versionamento obrigatório. Tudo escopado por organizationId.
 * `generateFromIdea` usa o agente Product Manager para produzir o conteúdo,
 * com contexto de negócio (perfil da empresa + base de conhecimento).
 */
@Injectable()
export class PrdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly context: BusinessContextService,
  ) {}

  async list(orgId: string, query: PaginationQuery): Promise<Paginated<Prd>> {
    const { page, pageSize } = query;
    const [data, total] = await Promise.all([
      this.prisma.prd.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.prd.count({ where: { organizationId: orgId } }),
    ]);
    return { data, total, page, pageSize };
  }

  async getById(orgId: string, id: string): Promise<Prd & { versions: PrdVersion[] }> {
    const prd = await this.prisma.prd.findFirst({
      where: { id, organizationId: orgId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!prd) throw new NotFoundException('PRD não encontrado.');
    return prd;
  }

  /** Cria PRD + versão 1 a partir de conteúdo fornecido. */
  create(orgId: string, input: CreatePrdInput): Promise<Prd> {
    return this.prisma.prd.create({
      data: {
        organizationId: orgId,
        workspaceId: input.workspaceId ?? null,
        ideaId: input.ideaId ?? null,
        title: input.title,
        currentVersion: 1,
        versions: { create: { version: 1, content: input.content } },
      },
    });
  }

  /** Adiciona nova versão (incrementa currentVersion). */
  async addVersion(orgId: string, prdId: string, input: NewPrdVersionInput): Promise<PrdVersion> {
    const prd = await this.getById(orgId, prdId);
    const nextVersion = prd.currentVersion + 1;
    const [, version] = await this.prisma.$transaction([
      this.prisma.prd.update({
        where: { id: prdId },
        data: { currentVersion: nextVersion },
      }),
      this.prisma.prdVersion.create({
        data: {
          prdId,
          version: nextVersion,
          content: input.content,
          changeLog: input.changeLog ?? null,
        },
      }),
    ]);
    return version;
  }

  /** Gera um PRD a partir de uma ideia validada, via agente Product Manager. */
  async generateFromIdea(orgId: string, input: GeneratePrdInput): Promise<Prd> {
    const idea = await this.prisma.idea.findFirst({
      where: { id: input.ideaId, organizationId: orgId },
    });
    if (!idea) throw new NotFoundException('Ideia não encontrada.');

    const businessContext = await this.context.build(orgId);
    const content = await this.draftPrdContent(idea, businessContext);

    return this.prisma.prd.create({
      data: {
        organizationId: orgId,
        workspaceId: input.workspaceId ?? idea.workspaceId,
        ideaId: idea.id,
        title: `PRD: ${idea.title}`,
        currentVersion: 1,
        versions: {
          create: { version: 1, content, changeLog: 'Gerado por IA (Product Manager).' },
        },
      },
    });
  }

  private async draftPrdContent(idea: Idea, businessContext: string): Promise<PrdContent> {
    const system =
      'Você é um Product Manager sênior desta empresa. Produza um PRD conciso e acionável, ' +
      'ALINHADO ao contexto de negócio fornecido (setor, modelo, público, tom). ' +
      'Responda ESTRITAMENTE em JSON válido (sem comentários, sem markdown) com as chaves: ' +
      'vision (string), personas (array de {name, description, goals[]}), ' +
      'functionalRequirements (string[]), nonFunctionalRequirements (string[]), ' +
      'mvp ({scope: string[], outOfScope: string[]}), roadmapOutline (string[]). Escreva em português.';

    const ideaBlock = [
      `Título: ${idea.title}`,
      `Descrição: ${idea.description || '(sem descrição)'}`,
      idea.category ? `Categoria: ${idea.category}` : null,
      idea.tags.length ? `Tags: ${idea.tags.join(', ')}` : null,
      idea.complexity ? `Complexidade: ${idea.complexity}` : null,
      idea.revenuePotential != null ? `Potencial de receita (0-100): ${idea.revenuePotential}` : null,
      idea.estimatedMvpDays != null ? `Tempo estimado de MVP (dias): ${idea.estimatedMvpDays}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const user =
      (businessContext ? `${businessContext}\n\n---\n\n` : '') +
      `## Ideia\n${ideaBlock}\n\nGere o PRD para esta ideia, coerente com o contexto da empresa acima.`;

    let raw: string;
    try {
      const res = await this.ai.complete({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        cache: true,
        maxTokens: 4096,
      });
      raw = res.content;
    } catch (err) {
      throw new ServiceUnavailableException(
        `Geração por IA indisponível: ${(err as Error).message}. Configure ANTHROPIC_API_KEY.`,
      );
    }

    return prdContentSchema.parse(extractJson(raw));
  }
}

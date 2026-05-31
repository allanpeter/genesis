import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { extractJson } from '@genesis/ai';
import {
  roadmapDraftSchema,
  type GenerateRoadmapInput,
  type Paginated,
  type PaginationQuery,
  type RoadmapDraft,
} from '@genesis/shared';
import { WorkItemType, type Roadmap, type WorkItem } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/**
 * Roadmaps e sua hierarquia de WorkItems (EPIC→FEATURE→STORY→TASK).
 * `generateFromPrd` usa o agente Tech Lead para quebrar o PRD em backlog.
 * Tudo escopado por organizationId.
 */
@Injectable()
export class RoadmapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async list(orgId: string, query: PaginationQuery): Promise<Paginated<Roadmap>> {
    const { page, pageSize } = query;
    const [data, total] = await Promise.all([
      this.prisma.roadmap.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.roadmap.count({ where: { organizationId: orgId } }),
    ]);
    return { data, total, page, pageSize };
  }

  /** Roadmap com todos os work items, ordenados para montar a árvore/board. */
  async getById(orgId: string, id: string): Promise<Roadmap & { workItems: WorkItem[] }> {
    const roadmap = await this.prisma.roadmap.findFirst({
      where: { id, organizationId: orgId },
      include: { workItems: { orderBy: [{ type: 'asc' }, { position: 'asc' }] } },
    });
    if (!roadmap) throw new NotFoundException('Roadmap não encontrado.');
    return roadmap;
  }

  create(orgId: string, title: string, workspaceId?: string, prdId?: string): Promise<Roadmap> {
    return this.prisma.roadmap.create({
      data: {
        organizationId: orgId,
        title,
        workspaceId: workspaceId ?? null,
        prdId: prdId ?? null,
      },
    });
  }

  /** Gera roadmap + hierarquia de work items a partir do PRD (última versão), via agente. */
  async generateFromPrd(orgId: string, input: GenerateRoadmapInput): Promise<Roadmap> {
    const prd = await this.prisma.prd.findFirst({
      where: { id: input.prdId, organizationId: orgId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!prd) throw new NotFoundException('PRD não encontrado.');
    const latest = prd.versions[0];
    if (!latest) throw new NotFoundException('PRD sem versões.');

    const draft = await this.draftRoadmap(prd.title, JSON.stringify(latest.content));
    const workspaceId = input.workspaceId ?? prd.workspaceId ?? undefined;

    const roadmap = await this.create(
      orgId,
      input.title ?? `Roadmap: ${prd.title}`,
      workspaceId,
      prd.id,
    );
    await this.persistDraft(orgId, roadmap.id, workspaceId, draft);
    return roadmap;
  }

  private async draftRoadmap(prdTitle: string, prdContentJson: string): Promise<RoadmapDraft> {
    const system =
      'Você é um Tech Lead sênior. Quebre o PRD em um backlog hierárquico. ' +
      'Responda ESTRITAMENTE em JSON válido (sem markdown) no formato: ' +
      '{ "epics": [ { "title": string, "description"?: string, "features": [ ' +
      '{ "title": string, "description"?: string, "stories": [ ' +
      '{ "title": string, "description"?: string, "tasks": string[] } ] } ] } ] }. ' +
      'Seja pragmático (poucos épicos, foco no MVP). Escreva em português.';
    const user = `PRD "${prdTitle}":\n${prdContentJson}\n\nGere o roadmap.`;

    let raw: string;
    try {
      const res = await this.ai.complete({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        cache: true,
        maxTokens: 6000,
      });
      raw = res.content;
    } catch (err) {
      throw new ServiceUnavailableException(
        `Geração por IA indisponível: ${(err as Error).message}. Configure ANTHROPIC_API_KEY.`,
      );
    }
    return roadmapDraftSchema.parse(extractJson(raw));
  }

  /** Persiste a árvore do draft como WorkItems com parentId e position. */
  private async persistDraft(
    orgId: string,
    roadmapId: string,
    workspaceId: string | undefined,
    draft: RoadmapDraft,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const base = { organizationId: orgId, roadmapId, workspaceId: workspaceId ?? null };

      let epicPos = 0;
      for (const epic of draft.epics) {
        const epicRow = await tx.workItem.create({
          data: {
            ...base,
            type: WorkItemType.EPIC,
            title: epic.title,
            description: epic.description ?? null,
            position: epicPos++,
          },
        });

        let featPos = 0;
        for (const feature of epic.features) {
          const featRow = await tx.workItem.create({
            data: {
              ...base,
              type: WorkItemType.FEATURE,
              parentId: epicRow.id,
              title: feature.title,
              description: feature.description ?? null,
              position: featPos++,
            },
          });

          let storyPos = 0;
          for (const story of feature.stories) {
            const storyRow = await tx.workItem.create({
              data: {
                ...base,
                type: WorkItemType.STORY,
                parentId: featRow.id,
                title: story.title,
                description: story.description ?? null,
                position: storyPos++,
              },
            });

            let taskPos = 0;
            for (const task of story.tasks) {
              await tx.workItem.create({
                data: {
                  ...base,
                  type: WorkItemType.TASK,
                  parentId: storyRow.id,
                  title: task,
                  position: taskPos++,
                },
              });
            }
          }
        }
      }
    });
  }
}

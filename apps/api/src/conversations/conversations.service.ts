import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { loadAgent, listAgentSlugs, mergeWithDbAgent } from '@genesis/ai';
import { extractJson } from '@genesis/ai';
import { prdContentSchema, roadmapDraftSchema } from '@genesis/shared';
import type { StartConversationInput, ReplyInput } from '@genesis/shared';
import type { Conversation, Message } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BusinessContextService } from '../company/business-context.service';
import { PrdsService } from '../prds/prds.service';
import { RoadmapsService } from '../roadmaps/roadmaps.service';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

export type MessageWithRole = {
  role: 'user' | 'assistant';
  content: string;
};

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

/**
 * Gerencia conversas com agentes: abertura, turnos e geração de artefatos.
 * Streaming via SSE (Observable<string>).
 */
@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly context: BusinessContextService,
    private readonly prds: PrdsService,
    private readonly roadmaps: RoadmapsService,
  ) {}

  listAgents() {
    return listAgentSlugs().map((slug) => {
      const def = loadAgent(slug);
      return { slug, name: def?.name ?? slug, role: def?.role ?? slug };
    });
  }

  async list(orgId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(orgId: string, id: string): Promise<ConversationWithMessages> {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada.');
    return conv;
  }

  /**
   * Inicia conversa com um agente. O agente lê o contexto (empresa, ideia)
   * e manda a primeira mensagem com as perguntas estratégicas iniciais.
   */
  async start(orgId: string, input: StartConversationInput): Promise<ConversationWithMessages> {
    const agentDef = await this.resolveAgent(orgId, input.agentSlug);
    const contextQuery = input.ideaId
      ? `${agentDef.name} para ideia vinculada`
      : agentDef.name;
    const businessContext = await this.context.build(orgId, contextQuery);

    let ideaContext = '';
    if (input.ideaId) {
      const idea = await this.prisma.idea.findFirst({
        where: { id: input.ideaId, organizationId: orgId },
      });
      if (idea) {
        ideaContext = [
          `\n\n## Ideia em discussão`,
          `Título: ${idea.title}`,
          idea.description ? `Descrição: ${idea.description}` : null,
          idea.category ? `Categoria: ${idea.category}` : null,
          idea.tags.length ? `Tags: ${idea.tags.join(', ')}` : null,
          idea.complexity ? `Complexidade: ${idea.complexity}` : null,
          idea.revenuePotential != null ? `Potencial de receita: ${idea.revenuePotential}/100` : null,
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    let prdContext = '';
    if (input.prdId) {
      const prd = await this.prisma.prd.findFirst({
        where: { id: input.prdId, organizationId: orgId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });
      if (prd?.versions[0]) {
        prdContext = `\n\n## PRD em discussão\nTítulo: ${prd.title}\n${JSON.stringify(prd.versions[0].content, null, 2)}`;
      }
    }

    const systemPrompt =
      agentDef.systemPrompt +
      (businessContext ? `\n\n---\n\n${businessContext}` : '') +
      ideaContext +
      prdContext;

    // O agente abre com a primeira mensagem estratégica
    const opening = await this.ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Olá! Vamos começar.',
        },
      ],
      cache: true,
    });

    const title =
      input.title ??
      `${agentDef.name} · ${new Date().toLocaleDateString('pt-BR')}`;

    const conv = await this.prisma.conversation.create({
      data: {
        organizationId: orgId,
        agentId: null,
        ideaId: input.ideaId ?? null,
        title,
        messages: {
          create: [
            { role: 'USER', content: 'Olá! Vamos começar.' },
            { role: 'ASSISTANT', content: opening.content },
          ],
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    // Armazena o systemPrompt resolvido nos metadados da conversa para turnos futuros
    // (o Agent DB record é opcional; usamos o campo agentId=null e guardamos o slug no título por ora)
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { title: `[${input.agentSlug}] ${title}` },
    });

    return { ...conv, title: `[${input.agentSlug}] ${title}` };
  }

  /**
   * Turno do usuário: adiciona mensagem e retorna resposta do agente.
   * A resposta é retornada diretamente (sem streaming) neste método.
   * Use `replyStream` para SSE.
   */
  async reply(orgId: string, convId: string, input: ReplyInput): Promise<Message> {
    const conv = await this.getById(orgId, convId);
    const { systemPrompt } = await this.rebuildSystemPrompt(orgId, conv, input.content);

    // Persiste a mensagem do usuário
    await this.prisma.message.create({
      data: { conversationId: convId, role: 'USER', content: input.content },
    });

    const history = this.buildHistory(conv.messages);
    history.push({ role: 'user', content: input.content });

    const response = await this.ai.complete({
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      cache: true,
    });

    const msg = await this.prisma.message.create({
      data: { conversationId: convId, role: 'ASSISTANT', content: response.content },
    });

    return msg;
  }

  /**
   * Versão streaming do reply: retorna Observable<string> para SSE.
   * Cada item é um chunk de texto; o último item é 'data: [DONE]'.
   * Como o Anthropic SDK tem streaming nativo, usamos ele diretamente aqui.
   */
  replyStream(orgId: string, convId: string, content: string): Observable<string> {
    const subject = new Subject<string>();

    void (async () => {
      try {
        const conv = await this.getById(orgId, convId);
        const { systemPrompt } = await this.rebuildSystemPrompt(orgId, conv, content);

        await this.prisma.message.create({
          data: { conversationId: convId, role: 'USER', content },
        });

        const history = this.buildHistory(conv.messages);
        history.push({ role: 'user', content });

        // Usamos a rota não-streaming do AiService e emitimos a resposta completa de uma vez.
        // Na Fase 2 trocaremos por streaming real via Anthropic SDK.
        const response = await this.ai.complete({
          messages: [{ role: 'system', content: systemPrompt }, ...history],
          cache: true,
        });

        const saved = await this.prisma.message.create({
          data: { conversationId: convId, role: 'ASSISTANT', content: response.content },
        });

        // Emite o texto em chunks de ~50 chars para simular streaming no cliente
        const text = saved.content;
        const chunkSize = 50;
        for (let i = 0; i < text.length; i += chunkSize) {
          subject.next(text.slice(i, i + chunkSize));
          await new Promise((r) => setTimeout(r, 15));
        }
        subject.next('[DONE]');
        subject.complete();
      } catch (err) {
        subject.error(err);
      }
    })();

    return subject.asObservable();
  }

  /**
   * Gera um artefato a partir da conversa (PRD, roadmap, validation, marketing).
   * Para PRD e Roadmap, persiste o resultado no banco e retorna savedId + savedType.
   */
  async generateArtifact(
    orgId: string,
    convId: string,
    artifact: 'prd' | 'roadmap' | 'validation' | 'marketing',
  ): Promise<{ artifact: string; result: unknown; savedId?: string; savedType?: string }> {
    const conv = await this.getById(orgId, convId);
    const { systemPrompt, agentSlug } = await this.rebuildSystemPrompt(orgId, conv);

    if (!this.artifactMatchesAgent(artifact, agentSlug)) {
      throw new BadRequestException(
        `Agente "${agentSlug}" não gera o artefato "${artifact}". Use o agente correto.`,
      );
    }

    const history = this.buildHistory(conv.messages);

    const artifactInstructions: Record<string, string> = {
      prd:
        'Com base em toda a conversa acima, gere agora o PRD em JSON com as chaves: ' +
        'vision (string), personas (array de {name, description, goals[]}), ' +
        'functionalRequirements (string[]), nonFunctionalRequirements (string[]), ' +
        'mvp ({scope: string[], outOfScope: string[]}), roadmapOutline (string[]). ' +
        'Responda APENAS com o JSON, sem explicações.',
      roadmap:
        'Com base em toda a conversa, gere o roadmap em JSON: ' +
        '{ "epics": [ { "title", "description"?, "features": [ { "title", "description"?, "stories": [ { "title", "description"?, "tasks": string[] } ] } ] } ] }. ' +
        'Responda APENAS com o JSON.',
      validation:
        'Com base em toda a conversa, gere a análise de viabilidade em JSON: ' +
        '{ viabilityScore (0-100), swot: {strengths[], weaknesses[], opportunities[], threats[]}, ' +
        'tamSamSom: {tam, sam, som, rationale}, revenueSources[], mainRisks[], recommendation }. ' +
        'Responda APENAS com o JSON.',
      marketing:
        'Com base em toda a conversa, gere o plano de marketing em JSON: ' +
        '{ positioning, mainMessage, targetSegments[], channels: [{channel, rationale, priority}], ' +
        'keyMessages[], contentPillars[], go_to_market_steps[] }. ' +
        'Responda APENAS com o JSON.',
    };

    const res = await this.ai.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: artifactInstructions[artifact]! },
      ],
      maxTokens: 6000,
    });

    const parsed = extractJson(res.content);

    if (artifact === 'prd') {
      try {
        const content = prdContentSchema.parse(parsed);
        const title = `PRD: ${(content.vision ?? '').slice(0, 80) || 'Gerado via chat'}`;
        const saved = await this.prds.create(orgId, {
          title,
          content,
          ideaId: (conv as typeof conv & { ideaId?: string | null }).ideaId ?? undefined,
        });
        return { artifact, result: parsed, savedId: saved.id, savedType: 'prd' };
      } catch {
        // Se a validação falhar, retorna o resultado sem persistir
      }
    }

    if (artifact === 'roadmap') {
      try {
        const draft = roadmapDraftSchema.parse(parsed);
        const convTitle = conv.title?.replace(/^\[[^\]]+\]\s*/, '') ?? 'Roadmap gerado via chat';
        const saved = await this.roadmaps.createFromDraft(orgId, convTitle, undefined, draft);
        return { artifact, result: parsed, savedId: saved.id, savedType: 'roadmap' };
      } catch {
        // Se a validação falhar, retorna o resultado sem persistir
      }
    }

    if (artifact === 'validation') {
      const ideaId = (conv as typeof conv & { ideaId?: string | null }).ideaId;
      if (ideaId) {
        try {
          const p = parsed as Record<string, unknown>;
          const score = typeof p.viabilityScore === 'number' ? p.viabilityScore : null;
          const saved = await this.prisma.validation.create({
            data: {
              ideaId,
              ...(p.swot != null && { swot: p.swot as object }),
              ...(p.tamSamSom != null && { tamSamSom: p.tamSamSom as object }),
              ...(Array.isArray(p.revenueSources) && { revenueSources: p.revenueSources as object }),
              ...((p.mainRisks != null || p.recommendation != null) && {
                marketAnalysis: { mainRisks: p.mainRisks, recommendation: p.recommendation } as object,
              }),
              viabilityScore: score,
            },
          });
          if (score !== null) {
            await this.prisma.idea.update({ where: { id: ideaId }, data: { viabilityScore: score } });
          }
          return { artifact, result: parsed, savedId: saved.id, savedType: 'validation' };
        } catch {
          // retorna resultado sem persistir se falhar
        }
      }
    }

    return { artifact, result: parsed };
  }

  private async resolveAgent(orgId: string, slug: string) {
    const fileDef = loadAgent(slug);
    if (!fileDef) throw new BadRequestException(`Agente "${slug}" não encontrado.`);

    // Verifica se existe customização no DB para esta org
    const dbAgent = await this.prisma.agent.findFirst({
      where: { organizationId: orgId, name: slug },
    });
    return dbAgent ? mergeWithDbAgent(fileDef, dbAgent) : fileDef;
  }

  private async rebuildSystemPrompt(orgId: string, conv: ConversationWithMessages, query?: string) {
    // O slug fica prefixado no título: "[product-manager] ..."
    const slugMatch = conv.title?.match(/^\[([^\]]+)\]/);
    const agentSlug = slugMatch?.[1] ?? 'product-manager';

    const [agentDef, businessContext] = await Promise.all([
      this.resolveAgent(orgId, agentSlug),
      this.context.build(orgId, query ?? agentSlug),
    ]);

    const systemPrompt =
      agentDef.systemPrompt + (businessContext ? `\n\n---\n\n${businessContext}` : '');

    return { systemPrompt, agentSlug };
  }

  private buildHistory(messages: Message[]): { role: 'user' | 'assistant'; content: string }[] {
    return messages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  private artifactMatchesAgent(artifact: string, slug: string): boolean {
    const map: Record<string, string[]> = {
      'product-manager': ['prd'],
      'tech-lead': ['roadmap'],
      validator: ['validation'],
      marketing: ['marketing'],
    };
    return map[slug]?.includes(artifact) ?? false;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../knowledge/rag.service';

const NAIVE_CHAR_BUDGET = 6000;

/**
 * Monta um "pacote de contexto" de negócio para injetar nos prompts dos agentes.
 * - Com RAG (OpenAI key + Qdrant): busca os chunks semanticamente mais relevantes.
 * - Sem RAG: fallback para os 10 documentos mais recentes (ordenação por recência).
 */
@Injectable()
export class BusinessContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
  ) {}

  async build(orgId: string, query?: string): Promise<string> {
    const [profile, knowledgeSection] = await Promise.all([
      this.prisma.companyProfile.findUnique({ where: { organizationId: orgId } }),
      this.buildKnowledgeSection(orgId, query),
    ]);

    const parts: string[] = [];

    if (profile) {
      const fields: Array<[string, string | null]> = [
        ['Setor', profile.sector],
        ['O que a empresa faz', profile.description],
        ['Modelo de negócio', profile.businessModel],
        ['Público-alvo', profile.targetAudience],
        ['Tom de voz', profile.tone],
        ['Gestor responsável', this.manager(profile.managerName, profile.managerRole)],
      ];
      const lines = fields
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `- ${k}: ${v}`);
      if (lines.length) parts.push(`## Perfil da empresa\n${lines.join('\n')}`);
    }

    if (knowledgeSection) parts.push(knowledgeSection);

    return parts.join('\n\n');
  }

  private async buildKnowledgeSection(orgId: string, query?: string): Promise<string | null> {
    if (query && this.rag.isAvailable) {
      const semantic = await this.rag.search(orgId, query);
      if (semantic) return `## Base de conhecimento (semântico)\n${semantic}`;
    }

    // Fallback: recência
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    if (!docs.length) return null;

    let budget = NAIVE_CHAR_BUDGET;
    const chunks: string[] = [];
    for (const doc of docs) {
      const body = (doc.content ?? '').slice(0, budget);
      if (!body) continue;
      chunks.push(`### ${doc.title}${doc.type ? ` (${doc.type})` : ''}\n${body}`);
      budget -= body.length;
      if (budget <= 0) break;
    }
    return chunks.length ? `## Base de conhecimento\n${chunks.join('\n\n')}` : null;
  }

  private manager(name: string | null, role: string | null): string | null {
    if (!name && !role) return null;
    return [name, role].filter(Boolean).join(' — ');
  }
}

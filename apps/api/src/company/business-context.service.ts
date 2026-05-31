import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KNOWLEDGE_CHAR_BUDGET = 6000;

/**
 * Monta um "pacote de contexto" de negócio para injetar nos prompts dos agentes.
 * Hoje: perfil da empresa + documentos recentes da Knowledge Base (recuperação ingênua).
 * Na Fase 2 a recuperação dos docs passa a ser semântica (RAG via Qdrant).
 */
@Injectable()
export class BusinessContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(orgId: string): Promise<string> {
    const [profile, docs] = await Promise.all([
      this.prisma.companyProfile.findUnique({ where: { organizationId: orgId } }),
      this.prisma.knowledgeDocument.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
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

    if (docs.length) {
      let budget = KNOWLEDGE_CHAR_BUDGET;
      const chunks: string[] = [];
      for (const doc of docs) {
        const body = (doc.content ?? '').slice(0, budget);
        if (!body) continue;
        chunks.push(`### ${doc.title}${doc.type ? ` (${doc.type})` : ''}\n${body}`);
        budget -= body.length;
        if (budget <= 0) break;
      }
      if (chunks.length) parts.push(`## Base de conhecimento\n${chunks.join('\n\n')}`);
    }

    return parts.join('\n\n');
  }

  private manager(name: string | null, role: string | null): string | null {
    if (!name && !role) return null;
    return [name, role].filter(Boolean).join(' — ');
  }
}

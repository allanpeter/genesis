import { z } from 'zod';

/** Perfil de negócio da organização — contexto para os agentes (ex.: gerar PRD). */
export const companyProfileSchema = z.object({
  sector: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
  businessModel: z.string().max(2000).optional(),
  targetAudience: z.string().max(2000).optional(),
  tone: z.string().max(500).optional(),
  managerName: z.string().max(120).optional(),
  managerRole: z.string().max(120).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const knowledgeDocTypes = [
  'decision',
  'incident',
  'learning',
  'pattern',
  'architecture',
  'playbook',
  'context',
] as const;

/** Documento da base de conhecimento (memória organizacional; futura fonte de RAG). */
export const createKnowledgeDocSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  title: z.string().min(2).max(200),
  type: z.enum(knowledgeDocTypes).default('context'),
  content: z.string().min(1).max(50_000),
});
export type CreateKnowledgeDocInput = z.infer<typeof createKnowledgeDocSchema>;

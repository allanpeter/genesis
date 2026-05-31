import { z } from 'zod';

export const ideaStatusSchema = z.enum([
  'CAPTURED',
  'TRIAGED',
  'VALIDATING',
  'VALIDATED',
  'APPROVED',
  'ARCHIVED',
  'REJECTED',
]);
export type IdeaStatusValue = z.infer<typeof ideaStatusSchema>;

export const complexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);

export const createIdeaSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(10_000).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  revenuePotential: z.number().int().min(0).max(100).optional(),
  complexity: complexitySchema.optional(),
  ecosystemSynergy: z.number().int().min(0).max(100).optional(),
  estimatedMvpDays: z.number().int().min(0).optional(),
  source: z.enum(['brain_dump', 'audio', 'import', 'manual']).default('manual'),
});
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

export const updateIdeaSchema = createIdeaSchema.partial().extend({
  status: ideaStatusSchema.optional(),
});
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

/** Insights sugeridos pela IA sobre uma ideia. */
export interface IdeaInsights {
  risks: string[];
  opportunities: string[];
  competitors: string[];
  businessModels: string[];
}

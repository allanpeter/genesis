import { z } from 'zod';

export const llmProviders = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'OPENROUTER', 'OLLAMA'] as const;

export const createAgentSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120).optional(),
  model: z.string().max(100).optional(),
  provider: z.enum(llmProviders).optional(),
  instructions: z.string().max(10_000).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().cuid().optional().nullable(),
});
export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = createAgentSchema.partial();
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

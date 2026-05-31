import { z } from 'zod';

export const startConversationSchema = z.object({
  agentSlug: z.string().min(1), // 'product-manager' | 'tech-lead' | 'validator' | 'marketing'
  ideaId: z.string().cuid().optional(),
  prdId: z.string().cuid().optional(),
  title: z.string().max(200).optional(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const replySchema = z.object({
  content: z.string().min(1).max(20_000),
});
export type ReplyInput = z.infer<typeof replySchema>;

export const generateArtifactSchema = z.object({
  artifact: z.enum(['prd', 'roadmap', 'validation', 'marketing']),
});
export type GenerateArtifactInput = z.infer<typeof generateArtifactSchema>;

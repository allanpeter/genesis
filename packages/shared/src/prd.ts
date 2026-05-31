import { z } from 'zod';

/** Conteúdo estruturado de uma versão de PRD. */
export const prdContentSchema = z.object({
  vision: z.string(),
  personas: z.array(
    z.object({ name: z.string(), description: z.string(), goals: z.array(z.string()) }),
  ),
  functionalRequirements: z.array(z.string()),
  nonFunctionalRequirements: z.array(z.string()),
  mvp: z.object({
    scope: z.array(z.string()),
    outOfScope: z.array(z.string()),
  }),
  roadmapOutline: z.array(z.string()).default([]),
});
export type PrdContent = z.infer<typeof prdContentSchema>;

export const createPrdSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  ideaId: z.string().cuid().optional(),
  title: z.string().min(3).max(200),
  content: prdContentSchema,
});
export type CreatePrdInput = z.infer<typeof createPrdSchema>;

export const newPrdVersionSchema = z.object({
  content: prdContentSchema,
  changeLog: z.string().max(2000).optional(),
});
export type NewPrdVersionInput = z.infer<typeof newPrdVersionSchema>;

/** Gera um PRD automaticamente a partir de uma ideia (via agente). */
export const generatePrdSchema = z.object({
  ideaId: z.string().cuid(),
  workspaceId: z.string().cuid().optional(),
});
export type GeneratePrdInput = z.infer<typeof generatePrdSchema>;

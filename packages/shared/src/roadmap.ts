import { z } from 'zod';

export const workItemTypeSchema = z.enum(['EPIC', 'FEATURE', 'STORY', 'TASK']);
export type WorkItemTypeValue = z.infer<typeof workItemTypeSchema>;

export const workItemStatusSchema = z.enum([
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
]);
export type WorkItemStatusValue = z.infer<typeof workItemStatusSchema>;

export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createWorkItemSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  roadmapId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  type: workItemTypeSchema,
  title: z.string().min(2).max(200),
  description: z.string().max(10_000).optional(),
  priority: prioritySchema.default('MEDIUM'),
  estimatePoints: z.number().int().min(0).max(100).optional(),
});
export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;

export const updateWorkItemSchema = createWorkItemSchema.partial().extend({
  status: workItemStatusSchema.optional(),
  position: z.number().int().min(0).optional(),
  assigneeType: z.enum(['USER', 'AGENT']).optional(),
  assigneeUserId: z.string().cuid().optional(),
  assigneeAgentId: z.string().cuid().optional(),
});
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;

/** Movimento de um card no Kanban (mudança de status/posição). */
export const moveWorkItemSchema = z.object({
  status: workItemStatusSchema,
  position: z.number().int().min(0).default(0),
});
export type MoveWorkItemInput = z.infer<typeof moveWorkItemSchema>;

/** Gera um roadmap (épicos→features→stories→tasks) a partir de um PRD (via agente). */
export const generateRoadmapSchema = z.object({
  prdId: z.string().cuid(),
  workspaceId: z.string().cuid().optional(),
  title: z.string().min(3).max(200).optional(),
});
export type GenerateRoadmapInput = z.infer<typeof generateRoadmapSchema>;

/**
 * Estrutura aninhada que o agente retorna ao gerar um roadmap.
 * Persistida como hierarquia EPIC → FEATURE → STORY → TASK em WorkItem.
 */
export const roadmapDraftSchema = z.object({
  epics: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      features: z
        .array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            stories: z
              .array(
                z.object({
                  title: z.string(),
                  description: z.string().optional(),
                  tasks: z.array(z.string()).default([]),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
    }),
  ),
});
export type RoadmapDraft = z.infer<typeof roadmapDraftSchema>;

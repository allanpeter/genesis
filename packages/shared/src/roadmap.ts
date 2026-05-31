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

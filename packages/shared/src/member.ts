import { z } from 'zod';

export const memberRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type MemberRoleInput = (typeof memberRoles)[number];

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8).max(100).optional(),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

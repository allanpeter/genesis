import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Claims do JWT de acesso. Carrega o tenant ativo. */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  organizationId: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
}

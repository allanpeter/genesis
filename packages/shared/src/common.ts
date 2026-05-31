import { z } from 'zod';

/** Resposta paginada padrão da API. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Formato canônico de erro da API. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
}

export const memberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
export type MemberRoleValue = z.infer<typeof memberRoleSchema>;

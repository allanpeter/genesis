import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@genesis/shared';

/** Injeta o usuário autenticado (com organizationId/role) no handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);

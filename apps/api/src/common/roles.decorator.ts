import { SetMetadata } from '@nestjs/common';
import type { MemberRoleValue } from '@genesis/shared';

export const ROLES_KEY = 'roles';

/** Restringe a rota a determinados papéis (RBAC). Ex.: @Roles('OWNER', 'ADMIN'). */
export const Roles = (...roles: MemberRoleValue[]) => SetMetadata(ROLES_KEY, roles);

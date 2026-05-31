import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser, MemberRoleValue } from '@genesis/shared';
import { ROLES_KEY } from './roles.decorator';

const RANK: Record<string, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** RBAC: garante que o papel do usuário atende ao mínimo exigido pela rota. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MemberRoleValue[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('Usuário não autenticado.');

    const userRank = RANK[user.role] ?? -1;
    const minRequired = Math.min(...required.map((r) => RANK[r] ?? 99));
    if (userRank < minRequired) {
      throw new ForbiddenException('Permissão insuficiente para esta ação.');
    }
    return true;
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '@genesis/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Grava em AuditLog toda mutação (POST/PUT/PATCH/DELETE) autenticada. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private static readonly MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;

    return next.handle().pipe(
      tap(() => {
        if (!user || !AuditInterceptor.MUTATIONS.has(req.method)) return;
        void this.prisma.auditLog
          .create({
            data: {
              organizationId: user.organizationId,
              userId: user.id,
              action: req.method,
              resourceType: req.route?.path ?? req.url,
              resourceId: req.params?.id ?? null,
              ip: req.ip ?? null,
            },
          })
          .catch(() => undefined); // auditoria nunca quebra a requisição
      }),
    );
  }
}

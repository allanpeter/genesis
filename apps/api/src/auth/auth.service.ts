import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthTokens, JwtPayload, LoginInput, RegisterInput } from '@genesis/shared';
import { MemberRole } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Cria org + usuário OWNER e retorna tokens. */
  async register(input: RegisterInput): Promise<AuthTokens> {
    const passwordHash = await argon2.hash(input.password);
    const slug = slugify(input.organizationName);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName, slug: await uniqueSlug(tx, slug) },
      });
      const user = await tx.user.create({
        data: { email: input.email, name: input.name, passwordHash },
      });
      const membership = await tx.membership.create({
        data: { organizationId: org.id, userId: user.id, role: MemberRole.OWNER },
      });
      return { user, membership };
    });

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role,
    });
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas.');

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');

    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Usuário sem organização.');

    return this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role,
    });
  }

  /** Troca um refresh token válido por novos access + refresh tokens. */
  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
      });
    } catch {
      throw new ForbiddenException('Refresh token inválido ou expirado. Faça login novamente.');
    }

    // Verifica se o token existe e não foi revogado
    const stored = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const match = await Promise.any(
      stored.map((t) => argon2.verify(t.tokenHash, rawRefreshToken).then((ok) => (ok ? t : Promise.reject()))),
    ).catch(() => null);

    if (!match || match.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token inválido ou expirado. Faça login novamente.');
    }

    // Revoga o token usado e emite um novo par (rotação de refresh token)
    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 900),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
      expiresIn: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
    });

    const tokenHash = await argon2.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL ?? 2_592_000) * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueSlug(
  tx: { organization: { findUnique: (a: { where: { slug: string } }) => Promise<unknown> } },
  base: string,
): Promise<string> {
  let slug = base || 'org';
  let n = 1;
  while (await tx.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
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

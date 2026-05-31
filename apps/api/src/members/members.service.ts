import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { MemberRole } from '@genesis/db';
import type { AcceptInviteInput, InviteMemberInput } from '@genesis/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      userId: m.userId,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    }));
  }

  async listPendingInvites(orgId: string) {
    return this.prisma.inviteToken.findMany({
      where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(orgId: string, invitedByUserId: string, input: InviteMemberInput) {
    const existing = await this.prisma.membership.findFirst({
      where: {
        organizationId: orgId,
        user: { email: input.email },
      },
    });
    if (existing) throw new BadRequestException('Este e-mail já é membro da organização.');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invite = await this.prisma.inviteToken.create({
      data: {
        organizationId: orgId,
        email: input.email,
        role: input.role as MemberRole,
        token,
        expiresAt,
      },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedByUserId },
      select: { name: true },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;

    await this.sendInviteEmail({
      to: input.email,
      inviterName: inviter?.name ?? 'Alguém',
      orgName: org?.name ?? 'sua organização',
      inviteUrl,
    });

    return { inviteUrl, expiresAt: invite.expiresAt };
  }

  async accept(input: AcceptInviteInput) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token: input.token },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!invite) throw new NotFoundException('Convite não encontrado.');
    if (invite.acceptedAt) throw new BadRequestException('Este convite já foi utilizado.');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Convite expirado.');

    let user = await this.prisma.user.findUnique({ where: { email: invite.email } });

    if (!user) {
      if (!input.name || !input.password) {
        throw new BadRequestException(
          'Nome e senha são obrigatórios para criar a conta.',
        );
      }
      const passwordHash = await argon2.hash(input.password);
      user = await this.prisma.user.create({
        data: { email: invite.email, name: input.name, passwordHash },
      });
    }

    const alreadyMember = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
    });
    if (alreadyMember) {
      await this.prisma.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return { message: 'Você já é membro desta organização.', organizationId: invite.organizationId };
    }

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
      }),
      this.prisma.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return {
      message: 'Convite aceito com sucesso!',
      organizationId: invite.organizationId,
      userId: user.id,
      email: user.email,
    };
  }

  async removeMember(orgId: string, requesterId: string, targetUserId: string) {
    const requester = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: requesterId } },
    });
    const target = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Membro não encontrado.');
    if (target.role === MemberRole.OWNER) throw new ForbiddenException('Não é possível remover o OWNER.');
    if (requesterId === targetUserId) throw new BadRequestException('Você não pode remover a si mesmo.');
    if (requester?.role === MemberRole.ADMIN && target.role === MemberRole.ADMIN) {
      throw new ForbiddenException('ADMIN não pode remover outro ADMIN.');
    }

    await this.prisma.membership.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    return { removed: true };
  }

  async revokeInvite(orgId: string, inviteId: string) {
    const invite = await this.prisma.inviteToken.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado.');
    await this.prisma.inviteToken.delete({ where: { id: inviteId } });
    return { revoked: true };
  }

  private async sendInviteEmail(opts: {
    to: string;
    inviterName: string;
    orgName: string;
    inviteUrl: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'Genesis <noreply@genesis.dev>',
      to: opts.to,
      subject: `${opts.inviterName} te convidou para ${opts.orgName}`,
      html: `
        <p>Olá!</p>
        <p><strong>${opts.inviterName}</strong> te convidou para colaborar em <strong>${opts.orgName}</strong> no Genesis.</p>
        <p><a href="${opts.inviteUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Aceitar convite</a></p>
        <p style="color:#6b7280;font-size:12px">Link: ${opts.inviteUrl}<br>Válido por 7 dias.</p>
      `,
    });
  }
}

import { Injectable } from '@nestjs/common';
import type { CompanyProfileInput } from '@genesis/shared';
import type { CompanyProfile, Prisma } from '@genesis/db';
import { PrismaService } from '../prisma/prisma.service';

/** Perfil de negócio da organização (1:1). Sempre escopado por organizationId. */
@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(orgId: string): Promise<CompanyProfile | null> {
    return this.prisma.companyProfile.findUnique({ where: { organizationId: orgId } });
  }

  upsertProfile(orgId: string, input: CompanyProfileInput): Promise<CompanyProfile> {
    const data = { ...input, extra: (input.extra ?? undefined) as Prisma.InputJsonValue };
    return this.prisma.companyProfile.upsert({
      where: { organizationId: orgId },
      update: data,
      create: { organizationId: orgId, ...data },
    });
  }
}

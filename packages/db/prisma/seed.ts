import { PrismaClient, MemberRole, IdeaStatus, Complexity } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Genesis…');

  const passwordHash = await argon2.hash('genesis123');

  const org = await prisma.organization.upsert({
    where: { slug: 'genesis-demo' },
    update: {},
    create: { name: 'Genesis Demo', slug: 'genesis-demo', plan: 'free' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'admin@genesis.dev' },
    update: {},
    create: { email: 'admin@genesis.dev', name: 'Admin Demo', passwordHash },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: { role: MemberRole.OWNER },
    create: { organizationId: org.id, userId: user.id, role: MemberRole.OWNER },
  });

  const workspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'primeiro-produto' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Primeiro Produto',
      slug: 'primeiro-produto',
      description: 'Workspace de exemplo gerado pelo seed.',
    },
  });

  await prisma.idea.create({
    data: {
      organizationId: org.id,
      workspaceId: workspace.id,
      title: 'Plataforma de automação para times enxutos',
      description: 'Centralizar ideias e transformá-las em produtos com agentes de IA.',
      category: 'SaaS',
      tags: ['ia', 'automação', 'produtividade'],
      revenuePotential: 80,
      complexity: Complexity.HIGH,
      ecosystemSynergy: 90,
      estimatedMvpDays: 45,
      status: IdeaStatus.CAPTURED,
      source: 'manual',
    },
  });

  console.log('✅ Seed concluído.');
  console.log('   Org:        genesis-demo');
  console.log('   Login:      admin@genesis.dev / genesis123');
  console.log('   Workspace:  primeiro-produto');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

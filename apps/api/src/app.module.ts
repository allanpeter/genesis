import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuditInterceptor } from './common/audit.interceptor';
import { RolesGuard } from './common/roles.guard';
import { CompanyModule } from './company/company.module';
import { ConversationsModule } from './conversations/conversations.module';
import { HealthModule } from './health/health.module';
import { IdeasModule } from './ideas/ideas.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PrdsModule } from './prds/prds.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoadmapsModule } from './roadmaps/roadmaps.module';

@Module({
  imports: [
    // .env fica na raiz do monorepo; tenta local primeiro, depois a raiz.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AiModule,
    AuthModule,
    HealthModule,
    IdeasModule,
    CompanyModule,
    ConversationsModule,
    KnowledgeModule,
    PrdsModule,
    RoadmapsModule,
  ],
  providers: [
    // JWT em todas as rotas por padrão; libere com @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RBAC: roda após o JWT; aplica @Roles().
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

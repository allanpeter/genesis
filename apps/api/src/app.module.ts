import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuditInterceptor } from './common/audit.interceptor';
import { RolesGuard } from './common/roles.guard';
import { HealthModule } from './health/health.module';
import { IdeasModule } from './ideas/ideas.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // .env fica na raiz do monorepo; tenta local primeiro, depois a raiz.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AiModule,
    AuthModule,
    HealthModule,
    IdeasModule,
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

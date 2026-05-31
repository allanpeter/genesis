# Progress Log

Registro vivo do que **realmente foi feito** (o roadmap em [architecture/05-dev-roadmap.md](architecture/05-dev-roadmap.md) é o plano).
Formato: entrada por sessão/data, mais recente no topo. Datas absolutas.

---

## 2026-05-31 — Fase 0: Fundação ✅

**Entregue:** scaffold do monorepo compilando e rodando ponta-a-ponta.

- Monorepo Turborepo + pnpm: `apps/web`, `apps/api`, `packages/{db,shared,ai,config}`.
- **DB**: Prisma + Postgres, 24 modelos (tenancy/RBAC/audit + fluxo Idea→PRD→Roadmap→WorkItem + agentes/knowledge/automation stubs). Migration `20260531124939_init` + seed.
- **API** (NestJS): auth JWT (register/login/me), `JwtAuthGuard` + `RolesGuard` globais, `AuditInterceptor`, validação Zod, Swagger, módulo `ideas` como padrão de referência multi-tenant.
- **Web** (Next.js 14): login + shell de workspace com os 12 módulos no menu, cliente de API com Bearer token.
- **AI** (`@genesis/ai`): `ProviderRegistry` com fallback; Anthropic real (prompt caching), demais stubs.
- **Infra**: docker-compose (Postgres **5440**, Redis, Qdrant, MinIO, Mailhog).
- **Docs**: 10 entregáveis de arquitetura em `docs/architecture/`.

**Verificado:** `pnpm build` (5/5), migrate + seed, `/health` (db:up), login→JWT, `/ideas` isolado por tenant, 401 sem token, AuditLog gravado.

**Decisões:** infra lean (BullMQ em vez de RabbitMQ; OpenSearch/observability adiados) · Anthropic primário · MVP alvo = Idea→PRD→Roadmap→Tasks.

**Correções de ambiente:** `.env` único na raiz (Nest via `envFilePath`, Prisma via `dotenv-cli`) · Postgres movido p/ 5440 (conflito com Postgres local na 5432).

**Pendências / próximo (Fase 1 — MVP):**
- [ ] PRD Generator (geração via agente + versionamento)
- [ ] Roadmap Builder (PRD → épicos/features/stories/tasks)
- [ ] Kanban (board de WorkItems)
- [ ] Idea Hub: brain dump + insights de IA
- [ ] Primeiro commit do repositório (ainda não commitado)
- [ ] Wire de um test runner (Jest/Vitest) — ainda não existe

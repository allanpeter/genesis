# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Genesis is a multi-tenant SaaS to turn ideas into products via AI agents. Central flow: **Ideia → Validação → PRD → Roadmap → Backlog → Dev → Marketing → Métricas**. Currently at **Phase 0 (foundation)**: scaffold builds/runs end-to-end (auth + tenancy + AI layer); module business logic is not implemented yet. See [docs/architecture/05-dev-roadmap.md](docs/architecture/05-dev-roadmap.md) and [docs/PROGRESS.md](docs/PROGRESS.md).

## Commands

```bash
# First-time setup
cp .env.example .env          # single .env at the REPO ROOT (not per-app)
pnpm install
pnpm infra:up                 # Postgres(5440) Redis Qdrant MinIO Mailhog via Docker
pnpm db:migrate               # prisma migrate dev (loads root .env via dotenv-cli)
pnpm db:seed                  # org/usuário demo → admin@genesis.dev / genesis123

# Dev (turbo runs web:3000 + api:3333 in watch)
pnpm dev
pnpm --filter @genesis/api dev     # just the API
pnpm --filter @genesis/web dev     # just the web

# Build / check the whole graph (turbo respects dependsOn ^build)
pnpm build
pnpm typecheck
pnpm lint

# DB
pnpm db:studio                # Prisma Studio
pnpm --filter @genesis/db migrate:dev   # create a new migration
```

There is **no test runner wired up yet** (`turbo run test` exists but no packages define `test`). Add Jest/Vitest per package when introducing tests.

## Monorepo layout

Turborepo + pnpm workspaces. Apps consume packages by name (`@genesis/*`).

- `apps/api` — NestJS REST under `/api/v1`, Swagger at `/api/docs`. Modules by bounded context (`auth`, `ideas`, `health`, `ai`, `prisma`, `common`).
- `apps/web` — Next.js 14 App Router + Tailwind + shadcn-style components. Talks to the API via `src/lib/api.ts` (Bearer token in `localStorage`).
- `packages/db` — Prisma schema + generated client + seed. **Source of truth for the data model.**
- `packages/shared` — Zod schemas + DTOs + types shared across web and api. Validation lives here, not duplicated.
- `packages/ai` — provider-agnostic LLM layer.
- `packages/config` — base tsconfig/eslint/prettier.

## Architecture you must understand before editing

### Multi-tenancy (shared-schema)
Every business table carries `organizationId`. **The tenant is never sent by the client** — it comes from the JWT claim and is injected via `@CurrentUser()`. Every service method filters by `organizationId`; see `apps/api/src/ideas/ideas.service.ts` as the canonical pattern. When adding a module, replicate this: scope all reads/writes by the org, and verify ownership before update/delete.

### Auth + RBAC (global guards)
`JwtAuthGuard` and `RolesGuard` are registered globally in `app.module.ts`. Therefore:
- Routes are **protected by default**. Mark public routes with `@Public()`.
- Restrict by role with `@Roles('ADMIN')` etc. Hierarchy: `OWNER > ADMIN > MEMBER > VIEWER` (rank-based, so `@Roles('MEMBER')` also allows ADMIN/OWNER).
- Every mutation (POST/PUT/PATCH/DELETE) is written to `AuditLog` by `AuditInterceptor` — no manual audit calls needed.

### Validation = Zod, not class-validator
There is **no global `ValidationPipe`** (class-validator isn't installed). Validate with `ZodValidationPipe` from schemas in `@genesis/shared`. Critical gotcha: apply the pipe at the **`@Body()` parameter**, never as method-level `@UsePipes` — `@UsePipes` runs the schema against *every* param including `@CurrentUser`, which fails spuriously.

### AI provider layer
`ProviderRegistry` (`packages/ai/src/registry.ts`) implements a **fallback chain** ordered by `AI_FALLBACK_ORDER` (default Anthropic → OpenAI → Gemini → OpenRouter → Ollama). Only configured providers (env key present) are tried; on error it falls through to the next. **Anthropic is the only real adapter** (with prompt caching); the others are stubs implementing the interface. Inject `AiService` (Nest facade) in modules; don't instantiate the registry directly.

## Build conventions (these will bite you)

- **Package entry points point to `dist`, not `src`.** `@genesis/db|shared|ai` expose compiled `dist/index.js`. Pointing `main` at TS source compiles but crashes at runtime (`ERR_MODULE_NOT_FOUND`). `@genesis/db`'s build is `prisma generate && tsc` for this reason.
- **`apps/api` sets `declaration:false`** — otherwise Prisma types trigger `TS2742` across the pnpm symlink. Controller methods returning Prisma models still need explicit return types (e.g. `Promise<Idea>`).
- **`apps/api` sets `incremental:false`** — nest's `deleteOutDir` wipes `dist` but leaves `.tsbuildinfo`, so incremental tsc skips emit and you get no `dist/main.js`.

## Environment

Single `.env` at the **repo root**. NestJS loads it via `ConfigModule` `envFilePath: ['.env', '../../.env']`; Prisma loads it via `dotenv -e ../../.env` in the db scripts. Postgres is on host port **5440** (not 5432) to avoid colliding with a local Postgres. When adding infra, keep ports in `infra/docker-compose.yml`, `.env`, and `.env.example` in sync.

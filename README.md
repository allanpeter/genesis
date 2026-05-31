# Genesis

> Plataforma SaaS multi-tenant que serve de **cérebro operacional** para transformar ideias em produtos via agentes de IA, automação e workflows estruturados — permitindo que uma pessoa ou time enxuto opere dezenas de projetos.

Fluxo central: **Ideia → Validação → PRD → Roadmap → Backlog → Desenvolvimento → Deploy → Marketing → Métricas → Aprendizados.**

## Status

Fase 0 — **Fundação / Scaffold**. Monorepo compilável e executável (auth + tenancy + camada de IA), sem lógica de negócio dos módulos ainda. Veja [docs/architecture/05-dev-roadmap.md](docs/architecture/05-dev-roadmap.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js (App Router) · TypeScript · Tailwind · shadcn/ui |
| Backend | NestJS · REST `/api/v1` · OpenAPI/Swagger |
| Banco | PostgreSQL + Prisma |
| Cache / Filas | Redis + BullMQ |
| Vetorial / RAG | Qdrant |
| Storage | S3 compatível (MinIO local) |
| IA | Anthropic (primário) + OpenAI · Gemini · OpenRouter · Ollama (fallback) |

## Estrutura

```
apps/
  web/        Next.js (UI)
  api/        NestJS (REST + workers BullMQ)
packages/
  db/         Prisma schema + client + seed
  shared/     tipos, Zod schemas, DTOs
  ai/         abstração de provedores LLM + fallback + embeddings
  ui/         componentes shadcn compartilhados
  config/     tsconfig / eslint / prettier base
docs/architecture/   os 10 entregáveis de arquitetura
infra/        docker-compose (Postgres, Redis, Qdrant, MinIO, Mailhog)
```

## Setup local

```bash
cp .env.example .env          # ajuste segredos e chaves de IA
pnpm install
pnpm infra:up                 # sobe Postgres, Redis, Qdrant, MinIO, Mailhog
pnpm db:migrate               # aplica migrations
pnpm db:seed                  # cria org/usuário demo
pnpm dev                      # sobe web (3000) + api (3333)
```

- API health: http://localhost:3333/api/v1/health
- Swagger: http://localhost:3333/api/docs
- Web: http://localhost:3000

Login demo (seed): `admin@genesis.dev` / `genesis123`

## Documentação

Os entregáveis de arquitetura estão em [docs/architecture/](docs/architecture/):
arquitetura, diagrama de módulos, modelo de dados, APIs, roadmap, escopo de MVP, fases futuras, monetização, estrutura de agentes e fluxos de automação.

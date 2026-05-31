# Progress Log

Registro vivo do que **realmente foi feito** (o roadmap em [architecture/05-dev-roadmap.md](architecture/05-dev-roadmap.md) é o plano).
Formato: entrada por sessão/data, mais recente no topo. Datas absolutas.

---

## 2026-05-31 — Agentes conversacionais com .md + geração de artefatos ✅

**Entregue:** agentes especializados que fazem perguntas estratégicas antes de gerar qualquer artefato.

- **Arquivos `.md` de agentes** (`packages/ai/agents/`): Product Manager, Tech Lead,
  Validador de Mercado, Marketing Manager — cada um com persona, perguntas obrigatórias
  e critério de quando gerar o artefato.
- **`AgentLoader`** (`packages/ai/src/agent-loader.ts`): lê e parseia os `.md`,
  **modelo híbrido** — `.md` é o default, DB (tabela `Agent`) sobrescreve/estende por org.
- **Módulo `conversations`** (API): `POST /start` abre conversa + agente lê contexto
  (empresa + ideia) e abre com perguntas; `POST /:id/reply` continua o turno;
  `POST /:id/generate` gera o artefato da conversa completa (PRD, roadmap, validation, marketing).
- **Web**: `/workspace/chat` — chat com selector de agente + ideia, chat multi-turno,
  painel lateral com o artefato gerado em JSON.

**Verificado (IA real):** PM notou inconsistência entre a ideia e o perfil da empresa, pediu
clarificação, fez perguntas estratégicas específicas (ticket médio, caixa necessário), e
gerou PRD contextualizado com personas do domínio. `pnpm build` 5/5 → 8 rotas.

**Pendente:** streaming real (hoje simula chunks) · persistência do `agentSlug` em campo
próprio (hoje no título) · UI de visualização do artefato mais rica (não só JSON bruto)
· salvar artefato gerado direto no banco (PRD/roadmap) a partir da conversa.

---

## 2026-05-31 — Idea Hub usável + contexto de negócio nos PRDs ✅

**Entregue:** PRDs deixam de ser genéricos — passam a usar perfil da empresa + base de
conhecimento + todos os campos da ideia. E o Idea Hub virou utilizável de verdade.

- **Schema**: `CompanyProfile` (1:1 com Organization) + migration `company_profile`.
- **API**: módulo `company` (GET/PUT `/company/profile`, ADMIN+) e `knowledge`
  (CRUD-lite `/knowledge`); `BusinessContextService` monta o "pacote de contexto"
  (perfil + docs recentes, com budget de chars) reutilizável pelos agentes.
- **Prompt do PRD enriquecido**: injeta o contexto de negócio + usa categoria, tags,
  complexidade, potencial de receita e tempo de MVP da ideia (antes só título+descrição).
- **Web**: página `/workspace/company` (editar perfil + gerenciar knowledge docs) e
  **Idea Hub reescrito** com formulário de cadastro completo, score de priorização
  (receita × sinergia × facilidade) e ordenação. Nav atualizada (Empresa).

**Verificado (IA real):** com perfil "logística/antecipação de frete" + 1 doc de decisão,
o PRD gerado para "carteira do motorista" trouxe visão e personas do domínio
("Zé do Caminhão", "Dona Cristina"), citando frete/antecipação/pedágio/combustível.
`pnpm build` 5/5.

**Pendente:** recuperação dos docs ainda é ingênua (10 recentes) — RAG semântico (Qdrant)
fica para a Fase 2 · edição de ideia (hoje cadastra/remove) · drag-and-drop no Kanban.

---

## 2026-05-31 — Fase 1 (parcial): PRD + Roadmap + Kanban (backend) 🚧

**Entregue:** vertical slice `Idea → PRD → Roadmap → Tasks` no backend + UI.

- **PRD module** (`apps/api/src/prds`): CRUD, **versionamento** (v1→vN), e `POST /prds/generate`
  que gera o conteúdo a partir de uma ideia via agente Product Manager.
- **Roadmap module** (`apps/api/src/roadmaps`): roadmap + hierarquia `WorkItem`
  (EPIC→FEATURE→STORY→TASK); `POST /roadmaps/generate` quebra o PRD em backlog via agente Tech Lead.
- **Kanban**: `PATCH /work-items/:id/move` (status + posição) + CRUD de work items.
- **Shared**: schemas `generatePrd`, `generateRoadmap`, `moveWorkItem`, `roadmapDraft`.
- **AI**: `extractJson` (tolera cercas/prosa) em `@genesis/ai`; geração usa `AiService` (fallback).
- **Web**: páginas `/workspace/prd` (gera + lista + visualiza versões) e
  `/workspace/roadmap` (gera + board Kanban com troca de status).

**Verificado (live, sem chave de IA):** criar PRD, adicionar versão (v2), buscar PRD com versões,
criar roadmap, criar work items (epic+task), **mover card no Kanban** (BACKLOG→IN_PROGRESS),
buscar roadmap com hierarquia. Endpoints de IA retornam **503** claro quando não há provider
(esperado). `extractJson` testado (fenced/bare/no-json). `pnpm build` 5/5.

**Pendente:** rodar geração de IA com `ANTHROPIC_API_KEY` real (caminho não testado live) ·
drag-and-drop no Kanban (hoje é dropdown de status) · testes automatizados.

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

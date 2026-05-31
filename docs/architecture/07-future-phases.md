# 07 — Fases Futuras

Detalhe dos módulos pós-MVP (ver sequência em [05-dev-roadmap.md](05-dev-roadmap.md)).

## Validation Engine (Fase 2)

Agentes executam em paralelo: análise de mercado, concorrência, SWOT, TAM/SAM/SOM, fontes de receita, dificuldade técnica → **score de viabilidade** consolidado. Resultados persistidos em `Validation` (JSONB) com histórico.

## Agent Workforce (Fase 2)

Agentes especializados (Product Manager, Tech Lead, Backend/Frontend Dev, QA, DevOps, Marketing, SEO, Sales, CS). Cada um com personalidade, instruções, modelo, ferramentas e memória. **Colaboração** via orquestrador (mensagens entre agentes) — ver [09-agent-structure.md](09-agent-structure.md).

## Knowledge Base + RAG (Fase 2)

Ingestão de decisões, incidentes, aprendizados, padrões, arquitetura, playbooks. Pipeline: chunking → embeddings → Qdrant. **Busca semântica obrigatória**; agentes recuperam contexto via RAG antes de agir.

## Automation Center + Integrations (Fase 3)

Gatilhos event-driven sobre BullMQ (ver [10-automation-flows.md](10-automation-flows.md)). Conectores: GitHub, GitLab, Jira, Linear, Slack, Discord, Telegram, Gmail, Google Calendar, N8N. Credenciais cifradas em repouso.

## Development Hub (Fase 3)

Integração com Claude Code, OpenAI, Codex, Cursor, Windsurf: geração de código/testes, revisão de PR, documentação — disparada a partir de `WorkItem`.

## Marketing / Metrics / Portfolio (Fase 4)

Marketing Hub (calendário editorial, posts, campanhas, landing pages) · Metrics & Revenue (MRR, churn, CAC, LTV, custos) · Startup Portfolio (visão consolidada de todos os produtos, ROI, velocidade).

## Escala / Comercial (Fase 5)

Marketplace de agentes (rev-share) · sistema de plugins · observability (Grafana/Prometheus/Loki) · troca de BullMQ→RabbitMQ e busca→OpenSearch sob carga · billing.

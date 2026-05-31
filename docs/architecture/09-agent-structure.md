# 09 — Estrutura de Agentes

Base de código: [`packages/ai`](../../packages/ai). Entidades: `Agent`, `AgentRun`, `Conversation`, `Message` (ver [03-data-model.md](03-data-model.md)).

## Anatomia de um agente

```mermaid
graph TD
  A[Agent] --> P[Personalidade + Instruções]
  A --> M[Modelo LLM<br/>provider + model]
  A --> T[Ferramentas/tools]
  A --> Mem[Memória<br/>Qdrant via RAG]
  A --> Runs[AgentRun<br/>histórico + tokens]
```

Cada `Agent` carrega: `name`, `role`, `personality`, `instructions`, `provider` (default ANTHROPIC), `model` (default `claude-opus-4-8`), `tools[]`, `memoryConfig`.

## Camada de provedores (fallback)

```mermaid
graph LR
  Req[CompletionRequest] --> R{ProviderRegistry}
  R -->|1| Anthropic
  R -->|2 fallback| OpenAI
  R -->|3| Gemini
  R -->|4| OpenRouter
  R -->|5| Ollama
  Anthropic -->|ok| Res[CompletionResult]
  Anthropic -.erro/timeout.-> OpenAI
```

`ProviderRegistry` (ver [`registry.ts`](../../packages/ai/src/registry.ts)) tenta cada provedor **configurado** na ordem (`AI_FALLBACK_ORDER`), passando ao próximo em falha. Anthropic já implementado com **prompt caching**; demais são stubs com a interface pronta.

## Catálogo de papéis (Agent Workforce)

Product Manager · Tech Lead · Backend Dev · Frontend Dev · QA Engineer · DevOps · Marketing Manager · SEO Specialist · Sales Assistant · Customer Success.

## Colaboração entre agentes (Fase 2)

```mermaid
sequenceDiagram
  participant PM as Product Manager
  participant TL as Tech Lead
  participant Dev as Backend Dev
  PM->>TL: PRD pronto, avalie viabilidade técnica
  TL->>Dev: quebre as features em tasks
  Dev-->>TL: estimativas + dependências
  TL-->>PM: roadmap técnico consolidado
```

Orquestrador roteia mensagens (`Conversation`/`Message`), injeta contexto via RAG e registra cada execução em `AgentRun` (tokens, provedor usado, status).

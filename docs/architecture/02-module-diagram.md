# 02 — Diagrama de Módulos

Os 12 módulos e suas dependências. O fluxo central (azul) é o caminho crítico ideia→produto; os demais são serviços de suporte.

```mermaid
graph LR
  M1[1. Idea Hub] --> M2[2. Validation Engine]
  M2 --> M3[3. PRD Generator]
  M3 --> M4[4. Roadmap Builder]
  M4 --> M9[9. Development Hub]
  M9 --> M10[10. Marketing Hub]
  M10 --> M11[11. Metrics & Revenue]
  M11 --> M12[12. Startup Portfolio]

  M5[5. Agent Workforce] -.fornece agentes.-> M2
  M5 -.-> M3
  M5 -.-> M4
  M5 -.-> M9
  M5 -.-> M10

  M7[7. Knowledge Base / RAG] -.memória.-> M5
  M6[6. Workspace] -.contém.-> M1
  M6 -.contém.-> M3
  M6 -.contém.-> M4
  M8[8. Automation Center] -.gatilhos.-> M1
  M8 -.gatilhos.-> M3
  M8 -.gatilhos.-> M4

  classDef core fill:#6366f1,stroke:#4338ca,color:#fff;
  class M1,M2,M3,M4 core;
```

## Mapa módulo → código

| # | Módulo | Entidades principais | Pacote/app |
|---|---|---|---|
| 1 | Idea Hub | `Idea` | `apps/api/src/ideas`, `apps/web/.../workspace` |
| 2 | Validation Engine | `Validation` | (fase 2) |
| 3 | PRD Generator | `Prd`, `PrdVersion` | (fase 1) |
| 4 | Roadmap Builder | `Roadmap`, `WorkItem` | (fase 1) |
| 5 | Agent Workforce | `Agent`, `AgentRun`, `Conversation`, `Message` | `@genesis/ai` |
| 6 | Workspace | `Workspace` | transversal |
| 7 | Knowledge Base | `KnowledgeDocument`, `KnowledgeChunk` + Qdrant | (fase 2) |
| 8 | Automation Center | `Automation` + BullMQ | (fase 3) |
| 9 | Development Hub | `Integration` | (fase 3) |
| 10 | Marketing Hub | `Agent` (marketing) | (fase 4) |
| 11 | Metrics & Revenue | `Metric` | (fase 4) |
| 12 | Startup Portfolio | agregação de `Workspace`/`Metric` | (fase 4) |

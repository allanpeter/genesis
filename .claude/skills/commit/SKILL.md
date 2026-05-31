---
name: commit
description: Stage all changes and create a git commit with an auto-generated message. Use when the user asks to commit, "faz um commit", "commitar", "salvar no git", "/commit". Stages everything and commits; does NOT push.
---

# Commit

Cria um commit a partir do estado atual do working tree: inspeciona o que mudou, escreve a mensagem, dá `git add` de tudo e commita. **Não faz push.**

## Regras

- **Nunca** inclua `Co-Authored-By`, `🤖 Generated with Claude Code`, nem qualquer trailer de atribuição. (O projeto também força isso via `attribution.commit: ""` no settings, mas não dependa disso — não adicione manualmente.)
- Mensagem em português, no imperativo, concisa.
- Stage **tudo** (`git add -A`). O `.env` já está no `.gitignore` e há hook que bloqueia staging acidental — não force `.env`.
- Não faça push a menos que o usuário peça explicitamente.

## Passos

1. **Inspecionar.** Rode em paralelo:
   - `git status --short`
   - `git diff --stat` e `git diff` (unstaged) + `git diff --cached` (já staged)
   - `git log --oneline -5` para casar o estilo das mensagens anteriores (se houver commits)

   Se não houver nada para commitar, avise e pare. Se não for repo git, ofereça `git init`.

2. **Stage tudo:** `git add -A`.

3. **Compor a mensagem.** Resuma a intenção real da mudança (não liste arquivo por arquivo):
   - **Subject** (≤ 72 chars): imperativo. Se o repo usa Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…), siga; senão, frase imperativa simples.
   - **Body** (opcional, só se agregar): 1–5 bullets com os blocos de mudança relevantes e o porquê.
   - Para muitas mudanças não relacionadas, agrupe por tema no body em vez de inventar um subject genérico tipo "várias mudanças".

4. **Commitar** com heredoc (preserva quebras de linha, sem trailer de atribuição):
   ```bash
   git commit -F - <<'EOF'
   <subject>

   - <bullet 1>
   - <bullet 2>
   EOF
   ```

5. **Confirmar:** `git log -1 --stat` e reporte o hash curto + subject. Não pushe.

## Exemplo de mensagem

```
chore: scaffold inicial do monorepo Genesis (Fase 0)

- monorepo Turbo+pnpm: apps/{web,api}, packages/{db,shared,ai,config}
- API NestJS com auth JWT, RBAC, multi-tenancy e auditoria
- Prisma + Postgres (migration inicial + seed) e camada de IA com fallback
- docs de arquitetura, CLAUDE.md e infra docker-compose
```

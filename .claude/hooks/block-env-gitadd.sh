#!/usr/bin/env bash
# PreToolUse(Bash) guard: blocks `git add` of a .env file (allows .env.example/.sample/.template).
# Reads the hook JSON on stdin; emits a PreToolUse deny decision when staging a secret env file.
set -euo pipefail

c=$(jq -r '.tool_input.command // empty')
[ -z "$c" ] && exit 0

# Isola apenas o(s) trecho(s) "git add ...", parando no próximo separador de shell
# (& | ; ) para não dar falso-positivo quando ".env" aparece em outra parte do comando
# composto (ex.: um echo ou grep depois de `git add -A && ...`).
segs=$(printf '%s' "$c" | grep -oE 'git[[:space:]]+add[^&|;]*' || true)
[ -z "$segs" ] && exit 0

# Bloqueia se um arquivo .env (início de nome: começo, espaço ou /) for argumento do git add,
# exceto templates (.env.example/.sample/.template).
if printf '%s' "$segs" | grep -qE '(^|[[:space:]/])\.env([[:space:]]|$|\.[A-Za-z0-9]+)' \
  && ! printf '%s' "$segs" | grep -qE '\.env\.(example|sample|template)'; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Bloqueado: git add de arquivo .env (segredos). Remova o .env do stage; ele já está no .gitignore."}}'
fi
exit 0

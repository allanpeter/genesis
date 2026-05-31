#!/usr/bin/env bash
# PreToolUse(Write|Edit) guard: blocks editing .env files (allows .env.example/.sample/.template).
# Reads the hook JSON on stdin; emits a PreToolUse deny decision when the target is a secret env file.
set -euo pipefail

f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
b=$(basename "$f")

if printf '%s' "$b" | grep -qE '^\.env(\..+)?$' \
  && ! printf '%s' "$b" | grep -qE '\.(example|sample|template)$'; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Bloqueado: arquivo .env contém segredos e não deve ser editado/commitado. Use .env.example para templates."}}'
fi
exit 0

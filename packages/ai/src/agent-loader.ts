import * as fs from 'fs';
import * as path from 'path';

export interface AgentDefinition {
  slug: string;
  name: string;
  role: string;
  model: string;
  /** Conteúdo completo do .md (abaixo do frontmatter), usado como system prompt base. */
  systemPrompt: string;
}

const AGENTS_DIR = path.join(__dirname, '..', 'agents');

/** Parseia frontmatter YAML simples (apenas strings — evita dependência de yaml parser). */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const [k, ...v] = line.split(':');
    if (k && v.length) meta[k.trim()] = v.join(':').trim();
  }
  return { meta, body: (match[2] ?? '').trim() };
}

/** Carrega um agente pelo slug a partir do arquivo .md no pacote. */
export function loadAgent(slug: string): AgentDefinition | null {
  const file = path.join(AGENTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  return {
    slug: meta.slug ?? slug,
    name: meta.name ?? slug,
    role: meta.role ?? slug,
    model: meta.model ?? 'claude-opus-4-8',
    systemPrompt: body,
  };
}

/** Lista todos os slugs de agentes disponíveis no pacote. */
export function listAgentSlugs(): string[] {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Mescla um agente do arquivo .md com overrides do banco de dados.
 * O DB pode sobrescrever `name`, `role`, `model` e `systemPrompt` (ou prefixar).
 */
export function mergeWithDbAgent(
  base: AgentDefinition,
  override: {
    name?: string | null;
    role?: string | null;
    model?: string | null;
    instructions?: string | null;
  },
): AgentDefinition {
  return {
    ...base,
    name: override.name ?? base.name,
    role: override.role ?? base.role,
    model: override.model ?? base.model,
    // Se o DB tiver instruções, elas são ADICIONADAS antes do .md (mais contexto, não substituição).
    systemPrompt: override.instructions
      ? `${override.instructions}\n\n---\n\n${base.systemPrompt}`
      : base.systemPrompt,
  };
}

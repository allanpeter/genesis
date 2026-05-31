/**
 * Extrai um objeto JSON da resposta de um LLM. Tolera:
 * - cercas de código (```json … ```)
 * - texto antes/depois do JSON (pega do primeiro `{` ao último `}`)
 */
export function extractJson<T = unknown>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Resposta do modelo não contém JSON válido.');
  }

  const slice = candidate.slice(start, end + 1);
  // Remove vírgulas finais (`,]` / `,}`) — erro comum em saída de LLM.
  const cleaned = slice.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Falha ao parsear JSON do modelo: ${(err as Error).message}`);
  }
}

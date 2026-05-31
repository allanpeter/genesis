import { AnthropicProvider } from './providers/anthropic';
import {
  createGeminiProvider,
  createOllamaProvider,
  createOpenAIProvider,
  createOpenRouterProvider,
} from './providers/stub';
import {
  CompletionRequest,
  CompletionResult,
  EmbeddingRequest,
  EmbeddingResult,
  LLMProvider,
  ProviderId,
} from './types';

const DEFAULT_ORDER: ProviderId[] = ['anthropic', 'openai', 'gemini', 'openrouter', 'ollama'];

/**
 * Registro de provedores + cadeia de fallback.
 * `complete`/`embed` tentam cada provedor configurado na ordem definida;
 * em erro/indisponibilidade, passam ao próximo. Anthropic é o primário.
 */
export class ProviderRegistry {
  private readonly providers: Map<ProviderId, LLMProvider>;
  private readonly order: ProviderId[];

  constructor(order?: ProviderId[]) {
    this.providers = new Map<ProviderId, LLMProvider>([
      ['anthropic', new AnthropicProvider()],
      ['openai', createOpenAIProvider()],
      ['gemini', createGeminiProvider()],
      ['openrouter', createOpenRouterProvider()],
      ['ollama', createOllamaProvider()],
    ]);
    this.order = order ?? parseOrderFromEnv() ?? DEFAULT_ORDER;
  }

  get(id: ProviderId): LLMProvider | undefined {
    return this.providers.get(id);
  }

  /** Provedores configurados, na ordem de fallback. */
  private chain(): LLMProvider[] {
    return this.order
      .map((id) => this.providers.get(id))
      .filter((p): p is LLMProvider => Boolean(p) && p!.isConfigured());
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    return this.runFallback((p) => p.complete(req), 'complete');
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResult> {
    return this.runFallback((p) => p.embed(req), 'embed');
  }

  /**
   * Streaming de texto delta via primeiro provedor configurado que suporta stream().
   * Se nenhum provedor suportar, faz complete() e emite o resultado inteiro de uma vez.
   */
  async *stream(req: CompletionRequest): AsyncIterable<string> {
    const chain = this.chain();
    if (chain.length === 0) throw new Error('Nenhum provedor de IA configurado para "stream".');

    for (const provider of chain) {
      if (typeof provider.stream === 'function') {
        yield* provider.stream(req);
        return;
      }
    }

    // Fallback: complete() emitido como chunk único
    const res = await this.complete(req);
    yield res.content;
  }

  private async runFallback<T>(
    fn: (p: LLMProvider) => Promise<T>,
    op: string,
  ): Promise<T> {
    const chain = this.chain();
    if (chain.length === 0) {
      throw new Error(`Nenhum provedor de IA configurado para "${op}".`);
    }
    const errors: string[] = [];
    for (const provider of chain) {
      try {
        return await fn(provider);
      } catch (err) {
        errors.push(`${provider.id}: ${(err as Error).message}`);
      }
    }
    throw new Error(`Todos os provedores falharam em "${op}":\n${errors.join('\n')}`);
  }
}

function parseOrderFromEnv(): ProviderId[] | undefined {
  const raw = process.env.AI_FALLBACK_ORDER;
  if (!raw) return undefined;
  const valid = new Set<ProviderId>(DEFAULT_ORDER);
  const parsed = raw
    .split(',')
    .map((s) => s.trim() as ProviderId)
    .filter((s) => valid.has(s));
  return parsed.length ? parsed : undefined;
}

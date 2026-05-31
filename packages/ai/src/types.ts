export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'ollama';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Habilita prompt caching quando o provedor suportar (ex.: Anthropic). */
  cache?: boolean;
}

export interface CompletionResult {
  content: string;
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface EmbeddingRequest {
  input: string[];
  model?: string;
}

export interface EmbeddingResult {
  vectors: number[][];
  provider: ProviderId;
  model: string;
}

export interface LLMProvider {
  readonly id: ProviderId;
  /** Indica se o provedor está configurado (chave/host presente). */
  isConfigured(): boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  embed(req: EmbeddingRequest): Promise<EmbeddingResult>;
  /** Streaming de texto delta. Opcional — provedores stub podem omitir. */
  stream?(req: CompletionRequest): AsyncIterable<string>;
}

/** Lançado quando o provedor não está configurado ou ainda não foi implementado. */
export class ProviderUnavailableError extends Error {
  constructor(
    public readonly providerId: ProviderId,
    reason: string,
  ) {
    super(`[${providerId}] indisponível: ${reason}`);
    this.name = 'ProviderUnavailableError';
  }
}

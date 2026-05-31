import {
  CompletionRequest,
  CompletionResult,
  EmbeddingRequest,
  EmbeddingResult,
  LLMProvider,
  ProviderId,
  ProviderUnavailableError,
} from '../types';

/**
 * Stub de provedor. Interface pronta; implementação real virá no MVP/fases.
 * `envKey` é a variável de ambiente que sinaliza configuração (chave ou host).
 */
export class StubProvider implements LLMProvider {
  constructor(
    readonly id: ProviderId,
    private readonly envKey: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(process.env[this.envKey]);
  }

  async complete(_req: CompletionRequest): Promise<CompletionResult> {
    throw new ProviderUnavailableError(this.id, 'adapter ainda não implementado');
  }

  async embed(_req: EmbeddingRequest): Promise<EmbeddingResult> {
    throw new ProviderUnavailableError(this.id, 'adapter ainda não implementado');
  }
}

export const createOpenAIProvider = () => new StubProvider('openai', 'OPENAI_API_KEY');
export const createGeminiProvider = () => new StubProvider('gemini', 'GEMINI_API_KEY');
export const createOpenRouterProvider = () => new StubProvider('openrouter', 'OPENROUTER_API_KEY');
export const createOllamaProvider = () => new StubProvider('ollama', 'OLLAMA_BASE_URL');

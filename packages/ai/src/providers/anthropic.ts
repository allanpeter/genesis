import Anthropic from '@anthropic-ai/sdk';
import {
  CompletionRequest,
  CompletionResult,
  EmbeddingRequest,
  EmbeddingResult,
  LLMProvider,
  ProviderUnavailableError,
} from '../types';

const DEFAULT_MODEL = 'claude-opus-4-8';

/**
 * Adapter Anthropic (provedor primário).
 * Usa prompt caching: a primeira mensagem de sistema é marcada com
 * cache_control para reduzir custo/latência em chamadas repetidas.
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic' as const;
  private client?: Anthropic;

  constructor(private readonly apiKey = process.env.ANTHROPIC_API_KEY) {
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.client) throw new ProviderUnavailableError(this.id, 'ANTHROPIC_API_KEY ausente');

    const system = req.messages.filter((m) => m.role === 'system').map((m) => m.content);
    const turns = req.messages.filter((m) => m.role !== 'system');
    const model = req.model ?? DEFAULT_MODEL;

    // Prompt caching: marca o bloco de sistema com cache_control quando habilitado.
    // Cast via unknown porque o tipo varia entre versões do SDK.
    const systemParam = (
      req.cache && system.length
        ? [{ type: 'text', text: system.join('\n\n'), cache_control: { type: 'ephemeral' } }]
        : system.join('\n\n') || undefined
    ) as unknown as Anthropic.MessageCreateParams['system'];

    const res = await this.client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 2048,
      // `temperature` é deprecado em modelos recentes (ex.: Opus 4.8) e gera 400.
      // Só enviamos quando o chamador define explicitamente.
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      system: systemParam,
      messages: turns.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      content: text,
      provider: this.id,
      model,
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    };
  }

  async embed(_req: EmbeddingRequest): Promise<EmbeddingResult> {
    // Anthropic não expõe embeddings nativos; use outro provedor (ex.: OpenAI/Ollama).
    throw new ProviderUnavailableError(this.id, 'embeddings não suportados; use outro provedor');
  }
}

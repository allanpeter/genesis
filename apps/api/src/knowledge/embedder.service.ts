import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

export { DIMENSIONS };

/**
 * Gera embeddings via OpenAI text-embedding-3-small.
 * Se OPENAI_API_KEY não estiver configurada, `embed()` retorna null
 * e o restante do pipeline degrada graciosamente para busca ingênua.
 */
@Injectable()
export class EmbedderService {
  private readonly logger = new Logger(EmbedderService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY não configurada — RAG semântico desativado (fallback: recência).');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.client) return null;
    try {
      const res = await this.client.embeddings.create({
        model: MODEL,
        input: text.slice(0, 8191),
      });
      return res.data[0]?.embedding ?? null;
    } catch (err) {
      this.logger.error('Erro ao gerar embedding:', (err as Error).message);
      return null;
    }
  }

  async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.client || texts.length === 0) return texts.map(() => null);
    try {
      const res = await this.client.embeddings.create({
        model: MODEL,
        input: texts.map((t) => t.slice(0, 8191)),
      });
      return res.data.map((d) => d.embedding);
    } catch (err) {
      this.logger.error('Erro ao gerar batch de embeddings:', (err as Error).message);
      return texts.map(() => null);
    }
  }
}

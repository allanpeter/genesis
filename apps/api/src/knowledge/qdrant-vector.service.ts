import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { DIMENSIONS } from './embedder.service';

const COLLECTION = 'genesis_knowledge';

export interface VectorPoint {
  id: string;          // KnowledgeChunk.id
  vector: number[];
  payload: {
    orgId: string;
    docId: string;
    chunkIndex: number;
    content: string;
    title: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

/**
 * Wrapper sobre o Qdrant. Usa uma coleção única (genesis_knowledge)
 * com filtro por `orgId` no payload para isolamento de tenant.
 * Degrada graciosamente quando Qdrant não está disponível.
 */
@Injectable()
export class QdrantVectorService implements OnModuleInit {
  private readonly logger = new Logger(QdrantVectorService.name);
  private client!: QdrantClient;
  private ready = false;

  async onModuleInit() {
    const url = process.env.QDRANT_URL ?? 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY || undefined;
    this.client = new QdrantClient({ url, apiKey });
    try {
      await this.ensureCollection();
      this.ready = true;
      this.logger.log(`Qdrant conectado em ${url}, coleção "${COLLECTION}" pronta.`);
    } catch (err) {
      this.logger.warn(`Qdrant indisponível (${(err as Error).message}) — RAG desativado.`);
    }
  }

  get isReady(): boolean {
    return this.ready;
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (!this.ready || points.length === 0) return;
    await this.client.upsert(COLLECTION, {
      wait: true,
      points: points.map((p) => ({
        id: this.toUuid(p.id),
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async deleteByDocId(orgId: string, docId: string): Promise<void> {
    if (!this.ready) return;
    await this.client.delete(COLLECTION, {
      wait: true,
      filter: {
        must: [
          { key: 'orgId', match: { value: orgId } },
          { key: 'docId', match: { value: docId } },
        ],
      },
    });
  }

  async search(orgId: string, queryVector: number[], topK = 5): Promise<SearchResult[]> {
    if (!this.ready) return [];
    const res = await this.client.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      filter: { must: [{ key: 'orgId', match: { value: orgId } }] },
      with_payload: true,
    });
    return res.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload as VectorPoint['payload'],
    }));
  }

  private async ensureCollection() {
    const { collections } = await this.client.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION);
    if (!exists) {
      await this.client.createCollection(COLLECTION, {
        vectors: { size: DIMENSIONS, distance: 'Cosine' },
      });
    }
  }

  /** Qdrant exige UUID v4. Derivamos um UUID determinístico do CUID. */
  private toUuid(cuid: string): string {
    const hex = Buffer.from(cuid.slice(0, 16).padEnd(16, '0')).toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
}

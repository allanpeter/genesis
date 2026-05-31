import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbedderService } from './embedder.service';
import { QdrantVectorService } from './qdrant-vector.service';

const CHUNK_SIZE = 1200;   // chars por chunk
const CHUNK_OVERLAP = 200; // overlap entre chunks
const CONTEXT_CHAR_BUDGET = 6000;

/**
 * Orquestra o pipeline RAG:
 * - indexDocument: divide em chunks → gera embeddings → upsert no Qdrant
 * - search: embedding da query → top-K chunks do Qdrant → texto formatado
 * Degrada graciosamente quando embedder ou Qdrant estão indisponíveis.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: EmbedderService,
    private readonly qdrant: QdrantVectorService,
  ) {}

  get isAvailable(): boolean {
    return this.embedder.isConfigured && this.qdrant.isReady;
  }

  /** Indexa (ou re-indexa) um documento. Chamado de forma assíncrona após create/update. */
  async indexDocument(orgId: string, docId: string): Promise<void> {
    if (!this.isAvailable) return;

    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id: docId } });
    if (!doc || !doc.content) return;

    // Remove chunks/vetores antigos deste doc
    await this.qdrant.deleteByDocId(orgId, docId);
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: docId } });

    const texts = this.chunkText(doc.content);
    const vectors = await this.embedder.embedBatch(texts);

    const points = [];
    for (let i = 0; i < texts.length; i++) {
      const vec = vectors[i];
      if (!vec) continue;

      const chunk = await this.prisma.knowledgeChunk.create({
        data: {
          documentId: docId,
          chunkIndex: i,
          content: texts[i]!,
          tokenCount: Math.ceil(texts[i]!.length / 4),
        },
      });

      await this.prisma.knowledgeChunk.update({
        where: { id: chunk.id },
        data: { vectorId: chunk.id },
      });

      points.push({
        id: chunk.id,
        vector: vec,
        payload: {
          orgId,
          docId,
          chunkIndex: i,
          content: texts[i]!,
          title: doc.title,
        },
      });
    }

    await this.qdrant.upsert(points);
    this.logger.debug(`Indexados ${points.length} chunks de "${doc.title}"`);
  }

  /** Remove vetores e chunks de um documento deletado. */
  async deleteDocument(orgId: string, docId: string): Promise<void> {
    await Promise.all([
      this.qdrant.deleteByDocId(orgId, docId),
      this.prisma.knowledgeChunk.deleteMany({ where: { documentId: docId } }),
    ]);
  }

  /**
   * Busca semântica: retorna texto formatado dos chunks mais relevantes.
   * Se RAG indisponível, retorna null e o caller usa fallback.
   */
  async search(orgId: string, query: string, topK = 6): Promise<string | null> {
    if (!this.isAvailable) return null;

    const queryVec = await this.embedder.embed(query);
    if (!queryVec) return null;

    const results = await this.qdrant.search(orgId, queryVec, topK);
    if (results.length === 0) return null;

    let budget = CONTEXT_CHAR_BUDGET;
    const seen = new Set<string>();
    const parts: string[] = [];

    for (const r of results) {
      const key = r.payload.docId;
      const content = r.payload.content.slice(0, budget);
      if (!content) continue;

      const header = seen.has(key) ? '' : `### ${r.payload.title}\n`;
      seen.add(key);
      parts.push(`${header}${content}`);
      budget -= content.length + header.length;
      if (budget <= 0) break;
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  }

  /** Divide texto em chunks com overlap. */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = start + CHUNK_SIZE;
      chunks.push(text.slice(start, end));
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter((c) => c.trim().length > 50);
  }
}

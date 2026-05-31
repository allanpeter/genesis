import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbedderService } from './embedder.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { QdrantVectorService } from './qdrant-vector.service';
import { RagService } from './rag.service';

@Module({
  imports: [PrismaModule],
  controllers: [KnowledgeController],
  providers: [EmbedderService, QdrantVectorService, RagService, KnowledgeService],
  exports: [RagService],
})
export class KnowledgeModule {}

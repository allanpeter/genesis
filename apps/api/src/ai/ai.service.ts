import { Injectable } from '@nestjs/common';
import { ProviderRegistry, type CompletionRequest, type CompletionResult } from '@genesis/ai';

/**
 * Fachada NestJS para a camada de IA. Encapsula o ProviderRegistry com
 * fallback (Anthropic primário). Módulos de negócio injetam este serviço.
 */
@Injectable()
export class AiService {
  private readonly registry = new ProviderRegistry();

  complete(req: CompletionRequest): Promise<CompletionResult> {
    return this.registry.complete(req);
  }

  stream(req: CompletionRequest): AsyncIterable<string> {
    return this.registry.stream(req);
  }
}

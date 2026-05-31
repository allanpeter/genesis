import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  Sse,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  generateArtifactSchema,
  replySchema,
  startConversationSchema,
  type AuthUser,
  type GenerateArtifactInput,
  type ReplyInput,
  type StartConversationInput,
} from '@genesis/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ConversationsService } from './conversations.service';
import { map } from 'rxjs/operators';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  /** Lista agentes disponíveis (slugs + nomes dos .md files). */
  @Get('agents')
  agents() {
    return this.conversations.listAgents();
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.list(user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.getById(user.organizationId, id);
  }

  @Post('start')
  @Roles('MEMBER')
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(startConversationSchema)) body: StartConversationInput,
  ) {
    return this.conversations.start(user.organizationId, body);
  }

  @Post(':id/reply')
  @Roles('MEMBER')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replySchema)) body: ReplyInput,
  ) {
    return this.conversations.reply(user.organizationId, id, body);
  }

  /** SSE endpoint: o cliente conecta aqui para receber a resposta em streaming. */
  @Sse(':id/stream')
  @Header('Cache-Control', 'no-cache')
  stream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) _res: Response,
    @Body(new ZodValidationPipe(replySchema)) body: ReplyInput,
  ) {
    return this.conversations
      .replyStream(user.organizationId, id, body.content)
      .pipe(map((chunk) => ({ data: chunk })));
  }

  @Post(':id/generate')
  @Roles('MEMBER')
  generate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(generateArtifactSchema)) body: GenerateArtifactInput,
  ) {
    return this.conversations.generateArtifact(user.organizationId, id, body.artifact);
  }
}

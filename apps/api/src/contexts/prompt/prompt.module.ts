import { Module } from '@nestjs/common';
import { PromptService } from '@contexts/prompt/application/prompt.service';
import { ClaudeCliAdapter } from '@contexts/prompt/infrastructure/claude-cli/claude-cli.adapter';
import { SessionReaderAdapter } from '@contexts/prompt/infrastructure/session/session-reader.adapter';
import { SessionManagerAdapter } from '@contexts/prompt/infrastructure/session/session-manager.adapter';
import { PromptHttpController } from '@contexts/prompt/presentation/http/prompt-http.controller';
import { SessionModule } from '@contexts/session/session.module';
import {
  LLM_EXECUTOR,
  SESSION_READER,
  SESSION_MANAGER,
} from './prompt.di-tokens';

@Module({
  imports: [SessionModule],
  controllers: [PromptHttpController],
  providers: [
    PromptService,
    { provide: LLM_EXECUTOR, useClass: ClaudeCliAdapter },
    { provide: SESSION_READER, useClass: SessionReaderAdapter },
    { provide: SESSION_MANAGER, useClass: SessionManagerAdapter },
  ],
})
export class PromptModule {}

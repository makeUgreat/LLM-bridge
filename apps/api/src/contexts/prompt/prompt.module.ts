import { Module } from '@nestjs/common';
import { PromptService } from './application/prompt.service.js';
import { ClaudeCliAdapter } from './infrastructure/claude-cli/claude-cli.adapter.js';
import { SessionReaderAdapter } from './infrastructure/session/session-reader.adapter.js';
import { SessionManagerAdapter } from './infrastructure/session/session-manager.adapter.js';
import { PromptHttpController } from './presentation/http/prompt-http.controller.js';
import { SessionModule } from '@contexts/session/session.module.js';
import {
  LLM_EXECUTOR,
  SESSION_READER,
  SESSION_MANAGER,
} from './prompt.di-tokens.js';

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

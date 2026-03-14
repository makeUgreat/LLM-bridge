import { Module } from '@nestjs/common';
import { PromptController } from './adapter/in/prompt.controller';
import { PromptService } from './application/prompt.service';
import { LlmPort } from './domain/llm.port';
import { SessionReaderPort } from './domain/session-reader.port';
import { SessionManagerPort } from './domain/session-manager.port';
import { ClaudeCliAdapter } from './adapter/out/claude-cli.adapter';
import {
  SessionReaderAdapter,
  SessionManagerAdapter,
} from './adapter/out/session.adapter';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  controllers: [PromptController],
  providers: [
    PromptService,
    { provide: LlmPort, useClass: ClaudeCliAdapter },
    { provide: SessionReaderPort, useClass: SessionReaderAdapter },
    { provide: SessionManagerPort, useClass: SessionManagerAdapter },
  ],
})
export class PromptModule {}

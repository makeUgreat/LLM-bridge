import { Module } from '@nestjs/common';
import { SessionService } from './application/session.service.js';
import { InMemorySessionRepository } from './infrastructure/in-memory/in-memory-session.repository.js';
import { SessionCleanupService } from './infrastructure/in-memory/session-cleanup.service.js';
import { SessionHttpController } from './presentation/http/session-http.controller.js';
import { SessionRepository } from './domain/index.js';
import { SESSION_REPOSITORY } from './session.di-tokens.js';

@Module({
  controllers: [SessionHttpController],
  providers: [
    SessionService,
    {
      provide: SESSION_REPOSITORY,
      useClass: InMemorySessionRepository,
    },
    SessionCleanupService,
  ],
  exports: [SessionService],
})
export class SessionModule {}

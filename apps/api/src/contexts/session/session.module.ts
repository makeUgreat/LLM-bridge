import { Module } from '@nestjs/common';
import { SessionService } from '@contexts/session/application/session.service';
import { InMemorySessionRepository } from '@contexts/session/infrastructure/in-memory/in-memory-session.repository';
import { SessionCleanupService } from '@contexts/session/infrastructure/in-memory/session-cleanup.service';
import { SessionHttpController } from '@contexts/session/presentation/http/session-http.controller';
import { SESSION_REPOSITORY } from './session.di-tokens';

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

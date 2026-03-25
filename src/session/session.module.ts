import { Module } from '@nestjs/common';
import { SessionController } from './adapter/in/session.controller';
import { SessionService } from './application/session.service';
import { SessionRepositoryPort } from './domain/session-repository.port';
import { InMemorySessionRepository } from './adapter/out/in-memory-session.repository';

@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    {
      provide: SessionRepositoryPort,
      useClass: InMemorySessionRepository,
    },
  ],
  exports: [SessionService, SessionRepositoryPort],
})
export class SessionModule {}

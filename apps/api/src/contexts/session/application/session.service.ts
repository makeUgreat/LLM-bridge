import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Session } from '@contexts/session/domain/index.js';
import { SessionRepository } from '@contexts/session/domain/index.js';
import { SESSION_REPOSITORY } from '@contexts/session/session.di-tokens.js';

@Injectable()
export class SessionService {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly repository: SessionRepository,
  ) {}

  create(): Session {
    const session = Session.create(randomUUID());
    return this.repository.save(session);
  }

  findOne(id: string): Session | undefined {
    return this.repository.find({ id });
  }

  findAll(): Session[] {
    return this.repository.list();
  }

  updateClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    const session = this.repository.find({ id: sessionId });
    if (session) {
      session.attachClaudeSession(claudeSessionId);
      this.repository.save(session);
    }
  }

  touch(id: string): void {
    const session = this.repository.find({ id });
    if (session) {
      session.touch();
      this.repository.save(session);
    }
  }

  remove(id: string): boolean {
    return this.repository.remove(id);
  }

  removeExpired(ttlMs: number): number {
    return this.repository.removeExpired(ttlMs);
  }
}

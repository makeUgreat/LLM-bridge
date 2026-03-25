import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Session } from '../domain/session.entity';
import { SessionRepositoryPort } from '../domain/session-repository.port';

@Injectable()
export class SessionService {
  constructor(private readonly repository: SessionRepositoryPort) {}

  create(): Session {
    const session = Session.create(randomUUID());
    return this.repository.save(session);
  }

  findOne(id: string): Session | undefined {
    return this.repository.findById(id);
  }

  findAll(): Session[] {
    return this.repository.findAll();
  }

  updateClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    const session = this.repository.findById(sessionId);
    if (session) {
      session.attachClaudeSession(claudeSessionId);
      this.repository.save(session);
    }
  }

  touch(id: string): void {
    const session = this.repository.findById(id);
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

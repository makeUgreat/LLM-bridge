import { Injectable } from '@nestjs/common';
import { SessionRepositoryPort } from '../../domain/session-repository.port';
import { Session } from '../../domain/session.entity';

@Injectable()
export class InMemorySessionRepository extends SessionRepositoryPort {
  private readonly sessions = new Map<string, Session>();

  save(session: Session): Session {
    this.sessions.set(session.id, session);
    return session;
  }

  findById(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  findAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  remove(id: string): boolean {
    return this.sessions.delete(id);
  }
}

import { Injectable } from '@nestjs/common';
import { Session, SessionRepository } from '@contexts/session/domain/index';

@Injectable()
export class InMemorySessionRepository extends SessionRepository {
  private readonly sessions = new Map<string, Session>();

  save(session: Session): Session {
    this.sessions.set(session.id, session);
    return session;
  }

  find(criteria: { id: string }): Session | undefined {
    return this.sessions.get(criteria.id);
  }

  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  remove(id: string): boolean {
    return this.sessions.delete(id);
  }

  removeExpired(ttlMs: number): number {
    const now = new Date();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (session.isExpired(ttlMs, now)) {
        this.sessions.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

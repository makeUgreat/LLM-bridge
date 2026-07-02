import { type Session } from './session.entity';

export abstract class SessionRepository {
  abstract save(session: Session): Session;
  abstract find(criteria: { id: string }): Session | undefined;
  abstract list(): Session[];
  abstract remove(id: string): boolean;
  abstract removeExpired(ttlMs: number): number;
}

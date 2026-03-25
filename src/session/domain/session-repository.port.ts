import { Session } from './session.entity';

export abstract class SessionRepositoryPort {
  abstract save(session: Session): Session;
  abstract findById(id: string): Session | undefined;
  abstract findAll(): Session[];
  abstract remove(id: string): boolean;
  abstract removeExpired(ttlMs: number): number;
}

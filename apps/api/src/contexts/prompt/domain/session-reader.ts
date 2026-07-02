import { type Session } from '@contexts/session/domain/index.js';

export abstract class SessionReader {
  abstract find(criteria: { id: string }): Session | undefined;
}

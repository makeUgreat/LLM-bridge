import { type Session } from '@contexts/session/domain/index.js';

export abstract class SessionManager {
  abstract create(): Session;
  abstract touch(id: string): void;
  abstract updateClaudeSessionId(
    sessionId: string,
    claudeSessionId: string,
  ): void;
  abstract remove(id: string): boolean;
}

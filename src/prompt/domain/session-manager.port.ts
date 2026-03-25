import { Session } from '../../session/domain/session.entity';

export abstract class SessionManagerPort {
  abstract create(): Session;
  abstract touch(id: string): void;
  abstract updateClaudeSessionId(
    sessionId: string,
    claudeSessionId: string,
  ): void;
  abstract remove(id: string): boolean;
}

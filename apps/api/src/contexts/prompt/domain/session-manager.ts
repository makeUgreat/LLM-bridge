import { type PromptSession } from './prompt-session';

export abstract class SessionManager {
  abstract create(): PromptSession;
  abstract touch(id: string): void;
  abstract updateClaudeSessionId(
    sessionId: string,
    claudeSessionId: string,
  ): void;
  abstract remove(id: string): boolean;
}

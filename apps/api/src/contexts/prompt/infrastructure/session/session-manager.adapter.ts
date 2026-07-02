import { Injectable } from '@nestjs/common';
import {
  SessionManager,
  type PromptSession,
} from '@contexts/prompt/domain/index';
import { SessionService } from '@contexts/session/application/session.service';

@Injectable()
export class SessionManagerAdapter extends SessionManager {
  constructor(private readonly sessionService: SessionService) {
    super();
  }

  create(): PromptSession {
    const session = this.sessionService.create();
    return {
      id: session.id,
      claudeSessionId: session.claudeSessionId,
    };
  }

  touch(id: string): void {
    this.sessionService.touch(id);
  }

  updateClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    this.sessionService.updateClaudeSessionId(sessionId, claudeSessionId);
  }

  remove(id: string): boolean {
    return this.sessionService.remove(id);
  }
}

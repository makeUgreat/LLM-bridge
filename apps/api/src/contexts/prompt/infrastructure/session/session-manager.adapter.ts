import { Injectable } from '@nestjs/common';
import { SessionManager } from '@contexts/prompt/domain/index.js';
import { SessionService } from '@contexts/session/application/session.service.js';
import { type Session } from '@contexts/session/domain/index.js';

@Injectable()
export class SessionManagerAdapter extends SessionManager {
  constructor(private readonly sessionService: SessionService) {
    super();
  }

  create(): Session {
    return this.sessionService.create();
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

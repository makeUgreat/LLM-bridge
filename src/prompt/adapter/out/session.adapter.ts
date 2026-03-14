import { Injectable } from '@nestjs/common';
import { SessionReaderPort } from '../../domain/session-reader.port';
import { SessionManagerPort } from '../../domain/session-manager.port';
import { SessionService } from '../../../session/application/session.service';
import { Session } from '../../../session/domain/session.entity';

@Injectable()
export class SessionReaderAdapter extends SessionReaderPort {
  constructor(private readonly sessionService: SessionService) {
    super();
  }

  findById(id: string): Session | undefined {
    return this.sessionService.findOne(id);
  }
}

@Injectable()
export class SessionManagerAdapter extends SessionManagerPort {
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

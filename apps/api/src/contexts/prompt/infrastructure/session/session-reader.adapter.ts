import { Injectable } from '@nestjs/common';
import {
  SessionReader,
  type PromptSession,
} from '@contexts/prompt/domain/index';
import { SessionService } from '@contexts/session/application/session.service';

@Injectable()
export class SessionReaderAdapter extends SessionReader {
  constructor(private readonly sessionService: SessionService) {
    super();
  }

  find(criteria: { id: string }): PromptSession | undefined {
    const session = this.sessionService.findOne(criteria.id);
    if (!session) {
      return undefined;
    }

    return {
      id: session.id,
      claudeSessionId: session.claudeSessionId,
    };
  }
}

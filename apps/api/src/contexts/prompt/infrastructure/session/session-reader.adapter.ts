import { Injectable } from '@nestjs/common';
import { SessionReader } from '@contexts/prompt/domain/index.js';
import { SessionService } from '@contexts/session/application/session.service.js';
import { type Session } from '@contexts/session/domain/index.js';

@Injectable()
export class SessionReaderAdapter extends SessionReader {
  constructor(private readonly sessionService: SessionService) {
    super();
  }

  find(criteria: { id: string }): Session | undefined {
    return this.sessionService.findOne(criteria.id);
  }
}

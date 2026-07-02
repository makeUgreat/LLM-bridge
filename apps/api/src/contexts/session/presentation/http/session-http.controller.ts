import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { SessionService } from '@contexts/session/application/session.service.js';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application/index.js';
import {
  type CreateSessionHttpResponse,
  type DeleteSessionHttpResponse,
  type SessionHttpResponse,
} from './dto/session.http.dto.js';

@Controller('sessions')
export class SessionHttpController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(): CreateSessionHttpResponse {
    const session = this.sessionService.create();
    return { sessionId: session.id, createdAt: session.createdAt };
  }

  @Get()
  findAll(): SessionHttpResponse[] {
    return this.sessionService.findAll().map((s) => ({
      id: s.id,
      claudeSessionId: s.claudeSessionId,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
    }));
  }

  @Delete(':id')
  remove(@Param('id') id: string): DeleteSessionHttpResponse {
    const deleted = this.sessionService.remove(id);
    if (!deleted) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'session.not_found',
        message: 'Session not found',
        details: {},
      });
    }
    return { deleted: true };
  }
}

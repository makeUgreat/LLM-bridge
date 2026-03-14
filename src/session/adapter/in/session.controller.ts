import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { SessionService } from '../../application/session.service';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  create() {
    const session = this.sessionService.create();
    return { sessionId: session.id, createdAt: session.createdAt };
  }

  @Get()
  findAll() {
    return this.sessionService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const deleted = this.sessionService.remove(id);
    if (!deleted) {
      throw new NotFoundException('Session not found');
    }
    return { deleted: true };
  }
}

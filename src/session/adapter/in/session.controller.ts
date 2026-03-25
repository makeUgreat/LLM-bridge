import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SessionService } from '../../application/session.service';
import {
  CreateSessionResponseDto,
  DeleteSessionResponseDto,
  SessionResponseDto,
} from './session-response.dto';

@ApiTags('sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: '새 세션 생성' })
  @ApiResponse({ status: 201, description: '세션 생성 완료', type: CreateSessionResponseDto })
  create(): CreateSessionResponseDto {
    const session = this.sessionService.create();
    return { sessionId: session.id, createdAt: session.createdAt };
  }

  @Get()
  @ApiOperation({ summary: '전체 세션 목록 조회' })
  @ApiResponse({ status: 200, description: '세션 목록', type: [SessionResponseDto] })
  findAll() {
    return this.sessionService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: '세션 삭제' })
  @ApiParam({ name: 'id', description: '세션 ID' })
  @ApiResponse({ status: 200, description: '세션 삭제 완료', type: DeleteSessionResponseDto })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  remove(@Param('id') id: string): DeleteSessionResponseDto {
    const deleted = this.sessionService.remove(id);
    if (!deleted) {
      throw new NotFoundException('Session not found');
    }
    return { deleted: true };
  }
}

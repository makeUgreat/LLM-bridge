import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiProduces } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { PromptService } from '../../application/prompt.service';
import { PromptDto } from './prompt.dto';
import { SyncPromptResponseDto } from './sync-prompt-response.dto';

@ApiTags('prompt')
@Controller()
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('sessions/:id/prompt/sync')
  @ApiOperation({ summary: '세션 컨텍스트에서 동기 프롬프트 실행' })
  @ApiParam({ name: 'id', description: '세션 ID' })
  @ApiResponse({ status: 200, description: '프롬프트 실행 결과', type: SyncPromptResponseDto })
  @ApiResponse({ status: 400, description: 'prompt 필수' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  @ApiResponse({ status: 504, description: 'LLM 실행 타임아웃' })
  async executeSyncWithSession(
    @Param('id') id: string,
    @Body() body: PromptDto,
  ): Promise<SyncPromptResponseDto> {
    if (!body.prompt) {
      throw new BadRequestException('prompt is required');
    }

    const result = await this.executeSyncWithTimeout(() =>
      this.promptService.executeSyncWithSession({
        sessionId: id,
        prompt: body.prompt,
        workingDir: body.workingDir,
        model: body.model,
        permissionMode: body.permissionMode,
        allowedTools: body.allowedTools,
        systemPrompt: body.systemPrompt,
      }),
    );

    if (!result) {
      throw new NotFoundException('Session not found');
    }

    return { text: result.text, error: result.error, exitCode: result.exitCode };
  }

  @Post('prompt/sync')
  @ApiOperation({ summary: '원샷 동기 프롬프트 실행 (세션 없음)' })
  @ApiResponse({ status: 200, description: '프롬프트 실행 결과', type: SyncPromptResponseDto })
  @ApiResponse({ status: 400, description: 'prompt 필수' })
  @ApiResponse({ status: 504, description: 'LLM 실행 타임아웃' })
  async executeSyncOneShot(
    @Body() body: PromptDto,
  ): Promise<SyncPromptResponseDto> {
    if (!body.prompt) {
      throw new BadRequestException('prompt is required');
    }

    const result = await this.executeSyncWithTimeout(() =>
      this.promptService.executeSyncOneShot({
        prompt: body.prompt,
        workingDir: body.workingDir,
        model: body.model,
        permissionMode: body.permissionMode,
        allowedTools: body.allowedTools,
        systemPrompt: body.systemPrompt,
      }),
    );

    return { text: result.text, error: result.error, exitCode: result.exitCode };
  }

  private async executeSyncWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw new HttpException('LLM execution timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw err;
    }
  }

  @Post('sessions/:id/prompt')
  @Sse()
  @ApiOperation({ summary: '세션 컨텍스트에서 스트리밍 프롬프트 실행 (SSE)' })
  @ApiParam({ name: 'id', description: '세션 ID' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'SSE 스트림', content: { 'text/event-stream': {} } })
  @ApiResponse({ status: 400, description: 'prompt 필수' })
  @ApiResponse({ status: 404, description: '세션을 찾을 수 없음' })
  executeWithSession(
    @Param('id') id: string,
    @Body() body: PromptDto,
  ): Observable<MessageEvent> {
    if (!body.prompt) {
      throw new BadRequestException('prompt is required');
    }

    const result = this.promptService.executeWithSession({
      sessionId: id,
      prompt: body.prompt,
      workingDir: body.workingDir,
      model: body.model,
      permissionMode: body.permissionMode,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });

    if (!result) {
      throw new NotFoundException('Session not found');
    }

    return result as unknown as Observable<MessageEvent>;
  }

  @Post('prompt')
  @Sse()
  @ApiOperation({ summary: '원샷 스트리밍 프롬프트 실행 (SSE, 세션 없음)' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'SSE 스트림', content: { 'text/event-stream': {} } })
  @ApiResponse({ status: 400, description: 'prompt 필수' })
  executeOneShot(@Body() body: PromptDto): Observable<MessageEvent> {
    if (!body.prompt) {
      throw new BadRequestException('prompt is required');
    }

    return this.promptService.executeOneShot({
      prompt: body.prompt,
      workingDir: body.workingDir,
      model: body.model,
      permissionMode: body.permissionMode,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    }) as unknown as Observable<MessageEvent>;
  }
}
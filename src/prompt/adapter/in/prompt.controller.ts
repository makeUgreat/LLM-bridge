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
import { Observable } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { PromptService } from '../../application/prompt.service';
import { PromptDto } from './prompt.dto';
import { SyncPromptResponseDto } from './sync-prompt-response.dto';

@Controller()
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('sessions/:id/prompt/sync')
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
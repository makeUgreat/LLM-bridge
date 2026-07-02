import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TimeoutError } from 'rxjs';
import { PromptService } from '@contexts/prompt/application/prompt.service.js';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application/index.js';
import {
  PromptBodyDto,
  type SyncPromptHttpResponse,
} from './dto/prompt.http.dto.js';

@Controller()
export class PromptHttpController {
  constructor(private readonly promptService: PromptService) {}

  @Post('sessions/:id/prompt/sync')
  @HttpCode(HttpStatus.OK)
  async executeSyncWithSession(
    @Param('id') id: string,
    @Body() body: PromptBodyDto,
  ): Promise<SyncPromptHttpResponse> {
    const result = await this.wrapTimeout(() =>
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
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'session.not_found',
        message: 'Session not found',
        details: {},
      });
    }

    return { text: result.text, error: result.error, exitCode: result.exitCode };
  }

  @Post('prompt/sync')
  @HttpCode(HttpStatus.OK)
  async executeSyncOneShot(
    @Body() body: PromptBodyDto,
  ): Promise<SyncPromptHttpResponse> {
    const result = await this.wrapTimeout(() =>
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

  @Post('sessions/:id/prompt')
  @Sse()
  executeWithSession(
    @Param('id') id: string,
    @Body() body: PromptBodyDto,
  ): Observable<MessageEvent> {
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
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'session.not_found',
        message: 'Session not found',
        details: {},
      });
    }

    return result as unknown as Observable<MessageEvent>;
  }

  @Post('prompt')
  @Sse()
  executeOneShot(
    @Body() body: PromptBodyDto,
  ): Observable<MessageEvent> {
    return this.promptService.executeOneShot({
      prompt: body.prompt,
      workingDir: body.workingDir,
      model: body.model,
      permissionMode: body.permissionMode,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    }) as unknown as Observable<MessageEvent>;
  }

  private async wrapTimeout<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw new HttpException('LLM execution timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw err;
    }
  }
}

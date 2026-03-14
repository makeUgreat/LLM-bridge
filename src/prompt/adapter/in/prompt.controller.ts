import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PromptService } from '../../application/prompt.service';
import { PromptDto } from './prompt.dto';

@Controller()
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

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

    return result;
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
    });
  }
}

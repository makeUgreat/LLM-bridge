import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ClaudeService } from "./claude.service";
import { SessionService } from "../session/session.service";

interface PromptDto {
  prompt: string;
  model?: string;
  workingDir?: string;
  permissionMode?: string;
  allowedTools?: string[];
  systemPrompt?: string;
}

@Controller()
export class PromptController {
  constructor(
    private readonly claudeService: ClaudeService,
    private readonly sessionService: SessionService
  ) {}

  @Post("sessions/:id/prompt")
  @Sse()
  executeWithSession(
    @Param("id") id: string,
    @Body() body: PromptDto
  ): Observable<MessageEvent> {
    const session = this.sessionService.findOne(id);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    if (!body.prompt) {
      throw new BadRequestException("prompt is required");
    }

    session.lastUsedAt = new Date();

    return this.claudeService.execute({
      prompt: body.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: body.workingDir,
      model: body.model,
      permissionMode: body.permissionMode,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });
  }

  @Post("prompt")
  @Sse()
  executeOneShot(@Body() body: PromptDto): Observable<MessageEvent> {
    if (!body.prompt) {
      throw new BadRequestException("prompt is required");
    }

    const session = this.sessionService.create();

    return this.claudeService.execute({
      prompt: body.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: body.workingDir,
      model: body.model,
      permissionMode: body.permissionMode,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });
  }
}
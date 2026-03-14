import {
  Controller,
  Post,
  Body,
  Param,
  Sse,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { IsArray, IsOptional, IsString } from "class-validator";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { ClaudeService } from "./claude.service";
import { SessionService } from "../session/session.service";

class PromptDto {
  @IsString()
  prompt!: string;

  // TODO: 프롬프트 옵션별 정확한 validation 추가 예정 (DDD 리팩토링 시 함께 처리)
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  workingDir?: string;

  @IsOptional()
  @IsString()
  permissionMode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @IsOptional()
  @IsString()
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

    this.sessionService.touch(id);

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
    }).pipe(finalize(() => this.sessionService.remove(session.id)));
  }
}
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { LlmPort } from '../domain/llm.port';
import { SessionReaderPort } from '../domain/session-reader.port';
import { SessionManagerPort } from '../domain/session-manager.port';
import { ClaudeOptions } from '../domain/claude-options.vo';

export interface ExecuteWithSessionOptions {
  sessionId: string;
  prompt: string;
  workingDir?: string;
  model?: string;
  permissionMode?: string;
  allowedTools?: string[];
  systemPrompt?: string;
}

export interface ExecuteOneShotOptions {
  prompt: string;
  workingDir?: string;
  model?: string;
  permissionMode?: string;
  allowedTools?: string[];
  systemPrompt?: string;
}

@Injectable()
export class PromptService {
  constructor(
    private readonly llmPort: LlmPort,
    private readonly sessionReaderPort: SessionReaderPort,
    private readonly sessionManagerPort: SessionManagerPort,
  ) {}

  executeWithSession(options: ExecuteWithSessionOptions): Observable<MessageEvent> {
    const session = this.sessionReaderPort.findById(options.sessionId);
    if (!session) {
      return undefined as unknown as Observable<MessageEvent>;
    }

    this.sessionManagerPort.touch(options.sessionId);

    const claudeOptions = ClaudeOptions.create({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    return this.llmPort.execute(claudeOptions).pipe(
      tap((event: MessageEvent) => {
        if (event.data?.session_id) {
          this.sessionManagerPort.updateClaudeSessionId(
            claudeOptions.sessionId,
            event.data.session_id,
          );
        }
      }),
    );
  }

  executeOneShot(options: ExecuteOneShotOptions): Observable<MessageEvent> {
    const session = this.sessionManagerPort.create();

    const claudeOptions = ClaudeOptions.create({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    return this.llmPort.execute(claudeOptions).pipe(
      tap((event: MessageEvent) => {
        if (event.data?.session_id) {
          this.sessionManagerPort.updateClaudeSessionId(
            claudeOptions.sessionId,
            event.data.session_id,
          );
        }
      }),
      finalize(() => this.sessionManagerPort.remove(session.id)),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { Observable, lastValueFrom, toArray } from 'rxjs';
import { finalize, tap, timeout } from 'rxjs/operators';
import { LlmPort } from '../domain/llm.port';
import { SessionReaderPort } from '../domain/session-reader.port';
import { SessionManagerPort } from '../domain/session-manager.port';
import { ClaudeOptions } from '../domain/claude-options.vo';
import { PromptResult } from '../domain/prompt-result.vo';
import {
  LlmEvent,
  LlmSessionIdEvent,
  LlmAssistantEvent,
} from '../domain/prompt-event.type';

const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS || '15000',
  10,
);

const SYNC_TIMEOUT_MS = parseInt(
  process.env.SYNC_TIMEOUT_MS || '300000',
  10,
);

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

  executeWithSession(options: ExecuteWithSessionOptions): Observable<LlmEvent> {
    const session = this.sessionReaderPort.findById(options.sessionId);
    if (!session) {
      return undefined as unknown as Observable<LlmEvent>;
    }

    this.sessionManagerPort.touch(options.sessionId);

    const claudeOptions = this.buildClaudeOptions({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    return this.withHeartbeat(this.buildSource(claudeOptions));
  }

  executeOneShot(options: ExecuteOneShotOptions): Observable<LlmEvent> {
    const session = this.sessionManagerPort.create();

    const claudeOptions = this.buildClaudeOptions({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      finalize(() => this.sessionManagerPort.remove(session.id)),
    );

    return this.withHeartbeat(source$);
  }

  async executeSyncWithSession(
    options: ExecuteWithSessionOptions,
  ): Promise<PromptResult | undefined> {
    const session = this.sessionReaderPort.findById(options.sessionId);
    if (!session) {
      return undefined;
    }

    this.sessionManagerPort.touch(options.sessionId);

    const claudeOptions = this.buildClaudeOptions({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      timeout(SYNC_TIMEOUT_MS),
    );

    return this.collectEvents(source$);
  }

  async executeSyncOneShot(
    options: ExecuteOneShotOptions,
  ): Promise<PromptResult> {
    const session = this.sessionManagerPort.create();

    const claudeOptions = this.buildClaudeOptions({
      prompt: options.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: options.workingDir,
      model: options.model,
      permissionMode: options.permissionMode,
      allowedTools: options.allowedTools,
      systemPrompt: options.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      finalize(() => this.sessionManagerPort.remove(session.id)),
      timeout(SYNC_TIMEOUT_MS),
    );

    return this.collectEvents(source$);
  }

  private buildClaudeOptions(params: {
    prompt: string;
    sessionId: string;
    claudeSessionId: string | null;
    workingDir?: string;
    model?: string;
    permissionMode?: string;
    allowedTools?: string[];
    systemPrompt?: string;
  }): ClaudeOptions {
    return ClaudeOptions.create(params);
  }

  private buildSource(claudeOptions: ClaudeOptions): Observable<LlmEvent> {
    return this.llmPort.execute(claudeOptions).pipe(
      tap((event: LlmEvent) => {
        const data = event.data as LlmSessionIdEvent;
        if ('session_id' in data) {
          this.sessionManagerPort.updateClaudeSessionId(
            claudeOptions.sessionId,
            data.session_id,
          );
        }
      }),
    );
  }

  private async collectEvents(
    source$: Observable<LlmEvent>,
  ): Promise<PromptResult> {
    const events = await lastValueFrom(source$.pipe(toArray()));

    const textParts: string[] = [];
    let error: string | null = null;
    let exitCode: number | null = null;

    for (const event of events) {
      const data = event.data;
      if ('type' in data) {
        switch (data.type) {
          case 'text':
            textParts.push(data.text);
            break;
          case 'assistant': {
            const contents = (data as LlmAssistantEvent).message?.content;
            if (Array.isArray(contents)) {
              for (const block of contents) {
                if (block.type === 'text' && block.text) {
                  textParts.push(block.text);
                }
              }
            }
            break;
          }
          case 'error':
            error = data.error;
            break;
          case 'done':
            exitCode = data.exitCode ?? null;
            break;
        }
      }
    }

    return PromptResult.create({
      text: textParts.join(''),
      error,
      exitCode,
    });
  }

  private withHeartbeat(
    source$: Observable<LlmEvent>,
  ): Observable<LlmEvent> {
    return new Observable((subscriber) => {
      const heartbeatTimer = setInterval(() => {
        subscriber.next({ data: { type: 'heartbeat' } });
      }, HEARTBEAT_INTERVAL_MS);

      const subscription = source$.subscribe({
        next: (value) => subscriber.next(value),
        error: (err) => {
          clearInterval(heartbeatTimer);
          subscriber.error(err);
        },
        complete: () => {
          clearInterval(heartbeatTimer);
          subscriber.complete();
        },
      });

      return () => {
        clearInterval(heartbeatTimer);
        subscription.unsubscribe();
      };
    });
  }
}
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { LlmPort } from '../domain/llm.port';
import { SessionReaderPort } from '../domain/session-reader.port';
import { SessionManagerPort } from '../domain/session-manager.port';
import { ClaudeOptions } from '../domain/claude-options.vo';

const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS || '15000',
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

    const source$ = this.llmPort.execute(claudeOptions).pipe(
      tap((event: MessageEvent) => {
        if (event.data?.session_id) {
          this.sessionManagerPort.updateClaudeSessionId(
            claudeOptions.sessionId,
            event.data.session_id,
          );
        }
      }),
    );

    return this.withHeartbeat(source$);
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

    const source$ = this.llmPort.execute(claudeOptions).pipe(
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

    return this.withHeartbeat(source$);
  }

  private withHeartbeat(
    source$: Observable<MessageEvent>,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const heartbeatTimer = setInterval(() => {
        subscriber.next({ data: { type: 'heartbeat' } } as MessageEvent);
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

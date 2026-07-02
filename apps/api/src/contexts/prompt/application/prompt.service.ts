import { Inject, Injectable } from '@nestjs/common';
import { Observable, lastValueFrom, toArray } from 'rxjs';
import { finalize, tap, timeout } from 'rxjs/operators';
import {
  LlmExecutor,
  SessionReader,
  SessionManager,
  ClaudeOptions,
  PromptResult,
  type LlmEvent,
} from '@contexts/prompt/domain/index';
import {
  LLM_EXECUTOR,
  SESSION_READER,
  SESSION_MANAGER,
} from '@contexts/prompt/prompt.di-tokens';

const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS ?? '15000',
  10,
);

const SYNC_TIMEOUT_MS = parseInt(process.env.SYNC_TIMEOUT_MS ?? '300000', 10);

export interface ExecuteWithSessionCommand {
  sessionId: string;
  prompt: string;
  workingDir?: string;
  model?: string;
  permissionMode?: string;
  allowedTools?: string[];
  systemPrompt?: string;
}

export interface ExecuteOneShotCommand {
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
    @Inject(LLM_EXECUTOR)
    private readonly llmExecutor: LlmExecutor,
    @Inject(SESSION_READER)
    private readonly sessionReader: SessionReader,
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
  ) {}

  executeWithSession(
    command: ExecuteWithSessionCommand,
  ): Observable<LlmEvent> | undefined {
    const session = this.sessionReader.find({ id: command.sessionId });
    if (!session) {
      return undefined;
    }

    this.sessionManager.touch(command.sessionId);

    const claudeOptions = ClaudeOptions.create({
      prompt: command.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: command.workingDir,
      model: command.model,
      permissionMode: command.permissionMode,
      allowedTools: command.allowedTools,
      systemPrompt: command.systemPrompt,
    });

    return this.withHeartbeat(this.buildSource(claudeOptions));
  }

  executeOneShot(command: ExecuteOneShotCommand): Observable<LlmEvent> {
    const session = this.sessionManager.create();

    const claudeOptions = ClaudeOptions.create({
      prompt: command.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: command.workingDir,
      model: command.model,
      permissionMode: command.permissionMode,
      allowedTools: command.allowedTools,
      systemPrompt: command.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      finalize(() => this.sessionManager.remove(session.id)),
    );

    return this.withHeartbeat(source$);
  }

  async executeSyncWithSession(
    command: ExecuteWithSessionCommand,
  ): Promise<PromptResult | undefined> {
    const session = this.sessionReader.find({ id: command.sessionId });
    if (!session) {
      return undefined;
    }

    this.sessionManager.touch(command.sessionId);

    const claudeOptions = ClaudeOptions.create({
      prompt: command.prompt,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId,
      workingDir: command.workingDir,
      model: command.model,
      permissionMode: command.permissionMode,
      allowedTools: command.allowedTools,
      systemPrompt: command.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      timeout(SYNC_TIMEOUT_MS),
    );

    return this.collectEvents(source$);
  }

  async executeSyncOneShot(
    command: ExecuteOneShotCommand,
  ): Promise<PromptResult> {
    const session = this.sessionManager.create();

    const claudeOptions = ClaudeOptions.create({
      prompt: command.prompt,
      sessionId: session.id,
      claudeSessionId: null,
      workingDir: command.workingDir,
      model: command.model,
      permissionMode: command.permissionMode,
      allowedTools: command.allowedTools,
      systemPrompt: command.systemPrompt,
    });

    const source$ = this.buildSource(claudeOptions).pipe(
      finalize(() => this.sessionManager.remove(session.id)),
      timeout(SYNC_TIMEOUT_MS),
    );

    return this.collectEvents(source$);
  }

  private buildSource(claudeOptions: ClaudeOptions): Observable<LlmEvent> {
    return this.llmExecutor.execute(claudeOptions).pipe(
      tap((event: LlmEvent) => {
        const data = event.data;
        if ('session_id' in data) {
          this.sessionManager.updateClaudeSessionId(
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
            const contents = data.message?.content;
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

    return PromptResult.create({ text: textParts.join(''), error, exitCode });
  }

  private withHeartbeat(source$: Observable<LlmEvent>): Observable<LlmEvent> {
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

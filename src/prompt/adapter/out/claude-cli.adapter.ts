import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { Observable } from 'rxjs';
import { LlmPort } from '../../domain/llm.port';
import { ClaudeOptions } from '../../domain/claude-options.vo';

@Injectable()
export class ClaudeCliAdapter extends LlmPort {
  private readonly timeoutMs: number;
  private static readonly KILL_GRACE_MS = 5000;

  constructor() {
    super();
    this.timeoutMs = parseInt(process.env.CLAUDE_TIMEOUT_MS || '300000', 10);
  }

  execute(options: ClaudeOptions): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const args = ['-p', '--output-format', 'stream-json', '--verbose'];

      if (options.claudeSessionId) {
        args.push('--resume', options.claudeSessionId);
      }
      if (options.model) {
        args.push('--model', options.model);
      }
      if (options.permissionMode) {
        args.push('--permission-mode', options.permissionMode);
      }
      if (options.allowedTools?.length) {
        args.push('--allowedTools', ...options.allowedTools);
      }
      if (options.systemPrompt) {
        args.push('--system-prompt', options.systemPrompt);
      }

      args.push(options.prompt);

      const child = spawn('claude', args, {
        cwd: options.workingDir || process.cwd(),
        env: { ...process.env, CLAUDECODE: undefined },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let buffer = '';
      let completed = false;
      let killTimer: ReturnType<typeof setTimeout> | undefined;

      const timeoutTimer = setTimeout(() => {
        if (completed) return;
        if (!child.killed) {
          child.kill('SIGTERM');
          killTimer = setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, ClaudeCliAdapter.KILL_GRACE_MS);
        }
        completed = true;
        subscriber.next({
          data: { type: 'error', error: 'Process timed out' },
        } as MessageEvent);
        subscriber.next({
          data: { type: 'done', exitCode: -1 },
        } as MessageEvent);
        subscriber.complete();
      }, this.timeoutMs);

      child.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            subscriber.next({
              data: parsed,
            } as MessageEvent);
          } catch {
            subscriber.next({
              data: { type: 'text', text: trimmed },
            } as MessageEvent);
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text) {
          subscriber.next({
            data: { type: 'error', error: text },
          } as MessageEvent);
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeoutTimer);
        clearTimeout(killTimer);

        if (completed) return;
        completed = true;

        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            subscriber.next({ data: parsed } as MessageEvent);
          } catch {
            subscriber.next({
              data: { type: 'text', text: buffer.trim() },
            } as MessageEvent);
          }
        }

        subscriber.next({
          data: { type: 'done', exitCode: code },
        } as MessageEvent);
        subscriber.complete();
      });

      child.on('error', (err) => {
        if (!child.killed) {
          child.kill('SIGTERM');
        }
        subscriber.error(err);
      });

      return () => {
        clearTimeout(timeoutTimer);
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      };
    });
  }
}

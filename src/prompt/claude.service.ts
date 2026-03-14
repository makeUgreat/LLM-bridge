import { Injectable } from "@nestjs/common";
import { spawn } from "child_process";
import { Observable } from "rxjs";
import { SessionService } from "../session/session.service";

export interface ClaudeOptions {
  prompt: string;
  sessionId: string;
  claudeSessionId: string | null;
  workingDir?: string;
  model?: string;
  permissionMode?: string;
  allowedTools?: string[];
  systemPrompt?: string;
}

@Injectable()
export class ClaudeService {
  constructor(private readonly sessionService: SessionService) {}

  execute(options: ClaudeOptions): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const args = ["-p", "--output-format", "stream-json"];

      if (options.claudeSessionId) {
        args.push("--resume", options.claudeSessionId);
      }
      if (options.model) {
        args.push("--model", options.model);
      }
      if (options.permissionMode) {
        args.push("--permission-mode", options.permissionMode);
      }
      if (options.allowedTools?.length) {
        args.push("--allowedTools", ...options.allowedTools);
      }
      if (options.systemPrompt) {
        args.push("--system-prompt", options.systemPrompt);
      }

      args.push(options.prompt);

      const child = spawn("claude", args, {
        cwd: options.workingDir || process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      child.stdout?.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            if (parsed.session_id) {
              this.sessionService.updateClaudeSessionId(
                options.sessionId,
                parsed.session_id
              );
            }

            subscriber.next({
              data: parsed,
            } as MessageEvent);
          } catch {
            subscriber.next({
              data: { type: "text", text: trimmed },
            } as MessageEvent);
          }
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString().trim();
        if (text) {
          subscriber.next({
            data: { type: "error", error: text },
          } as MessageEvent);
        }
      });

      child.on("close", (code) => {
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.session_id) {
              this.sessionService.updateClaudeSessionId(
                options.sessionId,
                parsed.session_id
              );
            }
            subscriber.next({ data: parsed } as MessageEvent);
          } catch {
            subscriber.next({
              data: { type: "text", text: buffer.trim() },
            } as MessageEvent);
          }
        }

        subscriber.next({
          data: { type: "done", exitCode: code },
        } as MessageEvent);
        subscriber.complete();
      });

      child.on("error", (err) => {
        if (!child.killed) {
          child.kill("SIGTERM");
        }
        subscriber.error(err);
      });

      // 구독 해제 시 프로세스 정리
      return () => {
        if (!child.killed) {
          child.kill("SIGTERM");
        }
      };
    });
  }
}
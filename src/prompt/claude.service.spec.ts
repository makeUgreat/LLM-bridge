import { EventEmitter } from "events";
import { firstValueFrom, toArray } from "rxjs";
import { spawn } from "child_process";
import { ClaudeService, ClaudeOptions } from "./claude.service";
import { SessionService } from "../session/session.service";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

const mockSpawn = jest.mocked(spawn);

function createFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: jest.Mock;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = jest.fn(() => {
    proc.killed = true;
  });
  return proc;
}

describe("ClaudeService", () => {
  let service: ClaudeService;
  let sessionService: SessionService;
  let fakeProc: ReturnType<typeof createFakeProcess>;

  beforeEach(() => {
    sessionService = new SessionService();
    service = new ClaudeService(sessionService);
    fakeProc = createFakeProcess();
    mockSpawn.mockReturnValue(fakeProc as any);
  });

  afterEach(() => {
    mockSpawn.mockReset();
  });

  function defaultOptions(overrides?: Partial<ClaudeOptions>): ClaudeOptions {
    return {
      prompt: "hello",
      sessionId: "sess-1",
      claudeSessionId: null,
      ...overrides,
    };
  }

  describe("args 빌드", () => {
    it("기본 인자를 전달한다", () => {
      service.execute(defaultOptions()).subscribe();

      expect(mockSpawn).toHaveBeenCalledWith(
        "claude",
        ["-p", "--output-format", "stream-json", "hello"],
        expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] })
      );
    });

    it("claudeSessionId가 있으면 --resume을 추가한다", () => {
      service
        .execute(defaultOptions({ claudeSessionId: "cs-1" }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain("--resume");
      expect(args).toContain("cs-1");
    });

    it("model 옵션을 전달한다", () => {
      service.execute(defaultOptions({ model: "opus" })).subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain("--model");
      expect(args).toContain("opus");
    });

    it("permissionMode 옵션을 전달한다", () => {
      service
        .execute(defaultOptions({ permissionMode: "plan" }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain("--permission-mode");
      expect(args).toContain("plan");
    });

    it("allowedTools 옵션을 전달한다", () => {
      service
        .execute(defaultOptions({ allowedTools: ["Read", "Write"] }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain("--allowedTools");
      expect(args).toContain("Read");
      expect(args).toContain("Write");
    });

    it("systemPrompt 옵션을 전달한다", () => {
      service
        .execute(defaultOptions({ systemPrompt: "be helpful" }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain("--system-prompt");
      expect(args).toContain("be helpful");
    });

    it("workingDir를 cwd로 전달한다", () => {
      service
        .execute(defaultOptions({ workingDir: "/tmp/work" }))
        .subscribe();

      expect(mockSpawn.mock.calls[0][2].cwd).toBe("/tmp/work");
    });
  });

  describe("stdout 처리", () => {
    it("JSON 라인을 파싱하여 MessageEvent로 방출한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit(
        "data",
        Buffer.from('{"type":"text","text":"hi"}\n')
      );
      fakeProc.emit("close", 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: "text", text: "hi" });
    });

    it("JSON 파싱 실패 시 text 타입으로 방출한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit("data", Buffer.from("not json\n"));
      fakeProc.emit("close", 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: "text", text: "not json" });
    });

    it("session_id가 있으면 updateClaudeSessionId를 호출한다", async () => {
      const spy = jest.spyOn(sessionService, "updateClaudeSessionId");
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit(
        "data",
        Buffer.from('{"session_id":"new-cs-id"}\n')
      );
      fakeProc.emit("close", 0);

      await promise;
      expect(spy).toHaveBeenCalledWith("sess-1", "new-cs-id");
    });

    it("빈 줄은 무시한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit(
        "data",
        Buffer.from('\n\n{"type":"text","text":"hi"}\n\n')
      );
      fakeProc.emit("close", 0);

      const events = await promise;
      // 빈 줄은 무시되고 text event + done event만 존재
      expect(events).toHaveLength(2);
    });
  });

  describe("stderr 처리", () => {
    it("error 타입 이벤트를 방출한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stderr.emit("data", Buffer.from("something went wrong"));
      fakeProc.emit("close", 1);

      const events = await promise;
      expect(events[0].data).toEqual({
        type: "error",
        error: "something went wrong",
      });
    });

    it("빈 문자열은 무시한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stderr.emit("data", Buffer.from("   \n  "));
      fakeProc.emit("close", 0);

      const events = await promise;
      // done만 있어야 함
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: "done", exitCode: 0 });
    });
  });

  describe("close 처리", () => {
    it("잔여 buffer를 JSON으로 파싱한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      // 개행 없이 보내면 buffer에 남는다
      fakeProc.stdout.emit(
        "data",
        Buffer.from('{"type":"result","text":"final"}')
      );
      fakeProc.emit("close", 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: "result", text: "final" });
      expect(events[1].data).toEqual({ type: "done", exitCode: 0 });
    });

    it("잔여 buffer JSON 파싱 실패 시 text 타입으로 방출한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit("data", Buffer.from("leftover text"));
      fakeProc.emit("close", 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: "text", text: "leftover text" });
    });

    it("빈 buffer면 done만 방출한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.emit("close", 0);

      const events = await promise;
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: "done", exitCode: 0 });
    });

    it("잔여 buffer의 session_id를 처리한다", async () => {
      const spy = jest.spyOn(sessionService, "updateClaudeSessionId");
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.stdout.emit(
        "data",
        Buffer.from('{"session_id":"from-buffer"}')
      );
      fakeProc.emit("close", 0);

      await promise;
      expect(spy).toHaveBeenCalledWith("sess-1", "from-buffer");
    });
  });

  describe("error 이벤트", () => {
    it("subscriber.error로 에러를 전파한다", async () => {
      const promise = firstValueFrom(
        service.execute(defaultOptions()).pipe(toArray())
      );

      fakeProc.emit("error", new Error("spawn failed"));

      await expect(promise).rejects.toThrow("spawn failed");
    });

    it("프로세스가 아직 살아있으면 SIGTERM으로 종료한다", () => {
      service.execute(defaultOptions()).subscribe({
        error: () => {
          // 에러 핸들러 등록 (unhandled error 방지)
        },
      });

      fakeProc.emit("error", new Error("spawn failed"));

      expect(fakeProc.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("이미 killed 상태면 kill을 호출하지 않는다", () => {
      service.execute(defaultOptions()).subscribe({
        error: () => {},
      });

      fakeProc.killed = true;
      fakeProc.emit("error", new Error("spawn failed"));

      expect(fakeProc.kill).not.toHaveBeenCalled();
    });
  });

  describe("구독 해제", () => {
    it("SIGTERM으로 프로세스를 종료한다", () => {
      const sub = service.execute(defaultOptions()).subscribe();

      sub.unsubscribe();

      expect(fakeProc.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("이미 killed 상태면 kill을 호출하지 않는다", () => {
      const sub = service.execute(defaultOptions()).subscribe();

      fakeProc.killed = true;
      sub.unsubscribe();

      expect(fakeProc.kill).not.toHaveBeenCalled();
    });
  });
});

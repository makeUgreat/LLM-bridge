import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { firstValueFrom, toArray } from 'rxjs';
import { spawn } from 'child_process';
import { ClaudeCliAdapter } from '@contexts/prompt/infrastructure/claude-cli/claude-cli.adapter.js';
import { ClaudeOptions, type LlmEvent } from '@contexts/prompt/domain/index.js';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

const TIMEOUT_MS = 300000;
const KILL_GRACE_MS = 5000;

const mockSpawn = vi.mocked(spawn);

function createFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

describe('ClaudeCliAdapter', () => {
  let adapter: ClaudeCliAdapter;
  let fakeProc: ReturnType<typeof createFakeProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ClaudeCliAdapter();
    fakeProc = createFakeProcess();
    mockSpawn.mockReturnValue(fakeProc as unknown as ReturnType<typeof spawn>);
  });

  afterEach(() => {
    mockSpawn.mockReset();
  });

  function defaultOptions(
    overrides?: Partial<{
      prompt: string;
      sessionId: string;
      claudeSessionId: string | null;
      workingDir: string;
      model: string;
      permissionMode: string;
      allowedTools: string[];
      systemPrompt: string;
    }>,
  ): ClaudeOptions {
    return ClaudeOptions.create({
      prompt: 'hello',
      sessionId: 'sess-1',
      claudeSessionId: null,
      ...overrides,
    });
  }

  describe('args 빌드', () => {
    it('기본 인자를 전달한다', () => {
      adapter.execute(defaultOptions()).subscribe();

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['-p', '--output-format', 'stream-json', '--verbose', 'hello'],
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
      );
    });

    it('claudeSessionId가 있으면 --resume을 추가한다', () => {
      adapter
        .execute(defaultOptions({ claudeSessionId: 'cs-1' }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--resume');
      expect(args).toContain('cs-1');
    });

    it('model 옵션을 전달한다', () => {
      adapter.execute(defaultOptions({ model: 'opus' })).subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--model');
      expect(args).toContain('opus');
    });

    it('permissionMode 옵션을 전달한다', () => {
      adapter
        .execute(defaultOptions({ permissionMode: 'plan' }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--permission-mode');
      expect(args).toContain('plan');
    });

    it('allowedTools 옵션을 전달한다', () => {
      adapter
        .execute(defaultOptions({ allowedTools: ['Read', 'Write'] }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--allowedTools');
      expect(args).toContain('Read');
      expect(args).toContain('Write');
    });

    it('systemPrompt 옵션을 전달한다', () => {
      adapter
        .execute(defaultOptions({ systemPrompt: 'be helpful' }))
        .subscribe();

      const args = mockSpawn.mock.calls[0][1];
      expect(args).toContain('--system-prompt');
      expect(args).toContain('be helpful');
    });

    it('workingDir를 cwd로 전달한다', () => {
      adapter
        .execute(defaultOptions({ workingDir: '/tmp/work' }))
        .subscribe();

      expect(mockSpawn.mock.calls[0][2].cwd).toBe('/tmp/work');
    });
  });

  describe('stdout 처리', () => {
    it('JSON 라인을 파싱하여 이벤트로 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit(
        'data',
        Buffer.from('{"type":"text","text":"hi"}\n'),
      );
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: 'text', text: 'hi' });
    });

    it('JSON 파싱 실패 시 text 타입으로 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit('data', Buffer.from('not json\n'));
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: 'text', text: 'not json' });
    });

    it('session_id가 포함된 이벤트를 그대로 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit(
        'data',
        Buffer.from('{"session_id":"new-cs-id"}\n'),
      );
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ session_id: 'new-cs-id' });
    });

    it('빈 줄은 무시한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit(
        'data',
        Buffer.from('\n\n{"type":"text","text":"hi"}\n\n'),
      );
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events).toHaveLength(2);
    });
  });

  describe('stderr 처리', () => {
    it('error 타입 이벤트를 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stderr.emit('data', Buffer.from('something went wrong'));
      fakeProc.emit('close', 1);

      const events = await promise;
      expect(events[0].data).toEqual({
        type: 'error',
        error: 'something went wrong',
      });
    });

    it('빈 문자열은 무시한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stderr.emit('data', Buffer.from('   \n  '));
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: 'done', exitCode: 0 });
    });
  });

  describe('close 처리', () => {
    it('잔여 buffer를 JSON으로 파싱한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit(
        'data',
        Buffer.from('{"type":"result","text":"final"}'),
      );
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: 'result', text: 'final' });
      expect(events[1].data).toEqual({ type: 'done', exitCode: 0 });
    });

    it('잔여 buffer JSON 파싱 실패 시 text 타입으로 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit('data', Buffer.from('leftover text'));
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ type: 'text', text: 'leftover text' });
    });

    it('빈 buffer면 done만 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: 'done', exitCode: 0 });
    });

    it('잔여 buffer의 session_id를 포함하여 방출한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.stdout.emit(
        'data',
        Buffer.from('{"session_id":"from-buffer"}'),
      );
      fakeProc.emit('close', 0);

      const events = await promise;
      expect(events[0].data).toEqual({ session_id: 'from-buffer' });
    });
  });

  describe('error 이벤트', () => {
    it('subscriber.error로 에러를 전파한다', async () => {
      const promise = firstValueFrom(
        adapter.execute(defaultOptions()).pipe(toArray()),
      );

      fakeProc.emit('error', new Error('spawn failed'));

      await expect(promise).rejects.toThrow('spawn failed');
    });

    it('프로세스가 아직 살아있으면 SIGTERM으로 종료한다', () => {
      adapter.execute(defaultOptions()).subscribe({
        error: () => {},
      });

      fakeProc.emit('error', new Error('spawn failed'));

      expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('이미 killed 상태면 kill을 호출하지 않는다', () => {
      adapter.execute(defaultOptions()).subscribe({
        error: () => {},
      });

      fakeProc.killed = true;
      fakeProc.emit('error', new Error('spawn failed'));

      expect(fakeProc.kill).not.toHaveBeenCalled();
    });
  });

  describe('구독 해제', () => {
    it('SIGTERM으로 프로세스를 종료한다', () => {
      const sub = adapter.execute(defaultOptions()).subscribe();

      sub.unsubscribe();

      expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('이미 killed 상태면 kill을 호출하지 않는다', () => {
      const sub = adapter.execute(defaultOptions()).subscribe();

      fakeProc.killed = true;
      sub.unsubscribe();

      expect(fakeProc.kill).not.toHaveBeenCalled();
    });
  });

  describe('타임아웃', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('타임아웃 시 SIGTERM을 전송하고 error+done을 방출한다', () => {
      const events: LlmEvent[] = [];
      adapter.execute(defaultOptions()).subscribe({
        next: (e) => events.push(e),
        complete: () => {},
      });

      vi.advanceTimersByTime(TIMEOUT_MS);

      expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(events).toHaveLength(2);
      expect(events[0].data).toEqual({
        type: 'error',
        error: 'Process timed out',
      });
      expect(events[1].data).toEqual({ type: 'done', exitCode: -1 });
    });

    it('SIGTERM 후 grace period 내 미종료 시 SIGKILL을 전송한다', () => {
      // kill이 호출되어도 killed를 false로 유지 (프로세스가 안 죽는 상황)
      fakeProc.kill = vi.fn();

      adapter.execute(defaultOptions()).subscribe({
        next: () => {},
        complete: () => {},
      });

      vi.advanceTimersByTime(TIMEOUT_MS);
      expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM');

      vi.advanceTimersByTime(KILL_GRACE_MS);
      expect(fakeProc.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('정상 종료 시 타임아웃이 발동하지 않는다', () => {
      const events: LlmEvent[] = [];
      adapter.execute(defaultOptions()).subscribe({
        next: (e) => events.push(e),
        complete: () => {},
      });

      fakeProc.emit('close', 0);
      vi.advanceTimersByTime(TIMEOUT_MS);

      // close에서 done 1개만 방출, 타임아웃 error는 없음
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: 'done', exitCode: 0 });
    });

    it('구독 해제 시 타임아웃 타이머가 클리어된다', () => {
      const sub = adapter.execute(defaultOptions()).subscribe({
        next: () => {},
      });

      sub.unsubscribe();
      vi.advanceTimersByTime(TIMEOUT_MS);

      // SIGTERM은 unsubscribe에서 1번만 호출, 타임아웃에서 추가 호출 없음
      expect(fakeProc.kill).toHaveBeenCalledTimes(1);
      expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });
});

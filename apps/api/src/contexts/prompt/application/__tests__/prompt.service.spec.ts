import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { Observable, Subject, of, firstValueFrom, toArray } from 'rxjs';
import { PromptService } from '@contexts/prompt/application/prompt.service';
import {
  LlmExecutor,
  SessionReader,
  SessionManager,
  PromptResult,
  type LlmEvent,
  type PromptSession,
} from '@contexts/prompt/domain/index';
import {
  LLM_EXECUTOR,
  SESSION_READER,
  SESSION_MANAGER,
} from '@contexts/prompt/prompt.di-tokens';

function promptSession(
  id: string,
  claudeSessionId: string | null = null,
): PromptSession {
  return { id, claudeSessionId };
}

describe('PromptService', () => {
  let service: PromptService;
  let llmExecutor: LlmExecutor;
  let sessionReader: SessionReader;
  let sessionManager: SessionManager;

  const mockObservable = of({
    data: { type: 'done', exitCode: 0 },
  } as LlmEvent);

  const mockLlmExecutor: LlmExecutor = {
    execute: vi.fn().mockReturnValue(mockObservable),
  };

  const mockSessionReader: SessionReader = {
    find: vi.fn(),
  };

  const mockSessionManager: SessionManager = {
    create: vi.fn(),
    touch: vi.fn(),
    updateClaudeSessionId: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        { provide: LLM_EXECUTOR, useValue: mockLlmExecutor },
        { provide: SESSION_READER, useValue: mockSessionReader },
        { provide: SESSION_MANAGER, useValue: mockSessionManager },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
    llmExecutor = mockLlmExecutor;
    sessionReader = mockSessionReader;
    sessionManager = mockSessionManager;
  });

  describe('executeWithSession', () => {
    it('세션을 조회하고 touch 후 LLM을 실행한다', () => {
      const session = promptSession('sess-1', 'claude-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const result = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result).toBeInstanceOf(Observable);
      expect(sessionReader.find).toHaveBeenCalledWith({ id: 'sess-1' });
      expect(sessionManager.touch).toHaveBeenCalledWith('sess-1');
      expect(llmExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          sessionId: 'sess-1',
          claudeSessionId: 'claude-1',
        }),
      );
    });

    it('세션이 없으면 undefined를 반환한다', () => {
      vi.mocked(sessionReader.find).mockReturnValue(undefined);

      const result = service.executeWithSession({
        sessionId: 'nonexistent',
        prompt: 'hello',
      });

      expect(result).toBeUndefined();
      expect(llmExecutor.execute).not.toHaveBeenCalled();
    });

    it('optional 필드를 LlmExecutor에 전달한다', () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
        model: 'opus',
        workingDir: '/tmp',
        permissionMode: 'plan',
        allowedTools: ['Read'],
        systemPrompt: 'be nice',
      });

      expect(llmExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'opus',
          workingDir: '/tmp',
          permissionMode: 'plan',
          allowedTools: ['Read'],
          systemPrompt: 'be nice',
        }),
      );
    });

    it('session_id 이벤트가 오면 updateClaudeSessionId를 호출한다', async () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const sessionIdEvent = of({
        data: { session_id: 'new-cs-id' },
      } as LlmEvent);
      vi.mocked(llmExecutor.execute).mockReturnValue(sessionIdEvent);

      const result = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      await firstValueFrom(result!.pipe(toArray()));

      expect(sessionManager.updateClaudeSessionId).toHaveBeenCalledWith(
        'sess-1',
        'new-cs-id',
      );
    });
  });

  describe('executeOneShot', () => {
    it('임시 세션을 생성하고 LLM을 실행한다', () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      const result = service.executeOneShot({ prompt: 'hello' });

      expect(result).toBeInstanceOf(Observable);
      expect(sessionManager.create).toHaveBeenCalled();
      expect(llmExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          sessionId: 'temp-1',
          claudeSessionId: null,
        }),
      );
    });

    it('스트림 완료 후 임시 세션을 삭제한다', async () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      const result = service.executeOneShot({ prompt: 'hello' });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManager.remove).toHaveBeenCalledWith('temp-1');
    });

    it('session_id 이벤트가 오면 updateClaudeSessionId를 호출한다', async () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      const sessionIdEvent = of({
        data: { session_id: 'new-cs-id' },
      } as LlmEvent);
      vi.mocked(llmExecutor.execute).mockReturnValue(sessionIdEvent);

      const result = service.executeOneShot({ prompt: 'hello' });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManager.updateClaudeSessionId).toHaveBeenCalledWith(
        'temp-1',
        'new-cs-id',
      );
    });
  });

  describe('executeSyncWithSession', () => {
    it('세션을 조회하고 이벤트를 수집하여 PromptResult를 반환한다', async () => {
      const session = promptSession('sess-1', 'claude-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'hello ' } } as LlmEvent,
        { data: { type: 'text', text: 'world' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      vi.mocked(llmExecutor.execute).mockReturnValue(events$);

      const result = await service.executeSyncWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result).toBeInstanceOf(PromptResult);
      expect(result!.text).toBe('hello world');
      expect(result!.error).toBeNull();
      expect(result!.exitCode).toBe(0);
      expect(sessionManager.touch).toHaveBeenCalledWith('sess-1');
    });

    it('세션이 없으면 undefined를 반환한다', async () => {
      vi.mocked(sessionReader.find).mockReturnValue(undefined);

      const result = await service.executeSyncWithSession({
        sessionId: 'nonexistent',
        prompt: 'hello',
      });

      expect(result).toBeUndefined();
      expect(llmExecutor.execute).not.toHaveBeenCalled();
    });

    it('assistant 타입 이벤트에서 텍스트를 추출한다', async () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const events$ = of(
        {
          data: {
            type: 'assistant',
            message: {
              content: [{ type: 'text', text: 'hello from assistant' }],
            },
          },
        } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      vi.mocked(llmExecutor.execute).mockReturnValue(events$);

      const result = await service.executeSyncWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result!.text).toBe('hello from assistant');
    });

    it('에러 이벤트를 캡처한다', async () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'partial' } } as LlmEvent,
        { data: { type: 'error', error: 'something failed' } } as LlmEvent,
        { data: { type: 'done', exitCode: 1 } } as LlmEvent,
      );
      vi.mocked(llmExecutor.execute).mockReturnValue(events$);

      const result = await service.executeSyncWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result!.text).toBe('partial');
      expect(result!.error).toBe('something failed');
      expect(result!.exitCode).toBe(1);
    });
  });

  describe('executeSyncOneShot', () => {
    it('임시 세션을 생성하고 이벤트를 수집하여 PromptResult를 반환한다', async () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'response' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      vi.mocked(llmExecutor.execute).mockReturnValue(events$);

      const result = await service.executeSyncOneShot({ prompt: 'hello' });

      expect(result).toBeInstanceOf(PromptResult);
      expect(result.text).toBe('response');
      expect(result.exitCode).toBe(0);
      expect(sessionManager.create).toHaveBeenCalled();
    });

    it('완료 후 임시 세션을 삭제한다', async () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      await service.executeSyncOneShot({ prompt: 'hello' });

      expect(sessionManager.remove).toHaveBeenCalledWith('temp-1');
    });

    it('session_id 이벤트가 오면 updateClaudeSessionId를 호출한다', async () => {
      const session = promptSession('temp-1');
      vi.mocked(sessionManager.create).mockReturnValue(session);

      const events$ = of(
        { data: { session_id: 'new-cs-id' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      vi.mocked(llmExecutor.execute).mockReturnValue(events$);

      await service.executeSyncOneShot({ prompt: 'hello' });

      expect(sessionManager.updateClaudeSessionId).toHaveBeenCalledWith(
        'temp-1',
        'new-cs-id',
      );
    });
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('스트림 중 heartbeat 이벤트가 주기적으로 방출된다', () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const source$ = new Subject<LlmEvent>();
      vi.mocked(llmExecutor.execute).mockReturnValue(source$.asObservable());

      const events: LlmEvent[] = [];
      const result$ = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });
      result$!.subscribe((e) => events.push(e));

      vi.advanceTimersByTime(15000);
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: 'heartbeat' });

      vi.advanceTimersByTime(15000);
      expect(events).toHaveLength(2);

      source$.next({ data: { type: 'done', exitCode: 0 } });
      source$.complete();

      expect(events).toHaveLength(3);
      expect(events[2].data).toEqual({ type: 'done', exitCode: 0 });
    });

    it('소스 완료 후 heartbeat가 중지된다', () => {
      const session = promptSession('sess-1');
      vi.mocked(sessionReader.find).mockReturnValue(session);

      const source$ = new Subject<LlmEvent>();
      vi.mocked(llmExecutor.execute).mockReturnValue(source$.asObservable());

      const events: LlmEvent[] = [];
      const result$ = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });
      result$!.subscribe((e) => events.push(e));

      source$.complete();
      const countAfterComplete = events.length;

      vi.advanceTimersByTime(30000);
      expect(events).toHaveLength(countAfterComplete);
    });
  });
});

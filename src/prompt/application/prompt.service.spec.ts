import { Test, TestingModule } from '@nestjs/testing';
import { Observable, Subject, of, firstValueFrom, toArray } from 'rxjs';
import { PromptService } from './prompt.service';
import { LlmPort } from '../domain/llm.port';
import { SessionReaderPort } from '../domain/session-reader.port';
import { SessionManagerPort } from '../domain/session-manager.port';
import { Session } from '../../session/domain/session.entity';
import { PromptResult } from '../domain/prompt-result.vo';
import { LlmEvent } from '../domain/prompt-event.type';

describe('PromptService', () => {
  let service: PromptService;
  let llmPort: LlmPort;
  let sessionReaderPort: SessionReaderPort;
  let sessionManagerPort: SessionManagerPort;

  const mockObservable = of({
    data: { type: 'done', exitCode: 0 },
  } as LlmEvent);

  const mockLlmPort: LlmPort = {
    execute: jest.fn().mockReturnValue(mockObservable),
  };

  const mockSessionReaderPort: SessionReaderPort = {
    findById: jest.fn(),
  };

  const mockSessionManagerPort: SessionManagerPort = {
    create: jest.fn(),
    touch: jest.fn(),
    updateClaudeSessionId: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptService,
        { provide: LlmPort, useValue: mockLlmPort },
        { provide: SessionReaderPort, useValue: mockSessionReaderPort },
        { provide: SessionManagerPort, useValue: mockSessionManagerPort },
      ],
    }).compile();

    service = module.get<PromptService>(PromptService);
    llmPort = module.get<LlmPort>(LlmPort);
    sessionReaderPort = module.get<SessionReaderPort>(SessionReaderPort);
    sessionManagerPort = module.get<SessionManagerPort>(SessionManagerPort);
  });

  describe('executeWithSession', () => {
    it('세션을 조회하고 touch 후 LLM을 실행한다', () => {
      const session = Session.create('sess-1');
      session.attachClaudeSession('claude-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const result = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result).toBeInstanceOf(Observable);
      expect(sessionReaderPort.findById).toHaveBeenCalledWith('sess-1');
      expect(sessionManagerPort.touch).toHaveBeenCalledWith('sess-1');
      expect(llmPort.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          sessionId: 'sess-1',
          claudeSessionId: 'claude-1',
        }),
      );
    });

    it('세션이 없으면 undefined를 반환한다', () => {
      jest.mocked(sessionReaderPort.findById).mockReturnValue(undefined);

      const result = service.executeWithSession({
        sessionId: 'nonexistent',
        prompt: 'hello',
      });

      expect(result).toBeUndefined();
      expect(llmPort.execute).not.toHaveBeenCalled();
    });

    it('optional 필드를 LlmPort에 전달한다', () => {
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
        model: 'opus',
        workingDir: '/tmp',
        permissionMode: 'plan',
        allowedTools: ['Read'],
        systemPrompt: 'be nice',
      });

      expect(llmPort.execute).toHaveBeenCalledWith(
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
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const sessionIdEvent = of({
        data: { session_id: 'new-cs-id' },
      } as LlmEvent);
      jest.mocked(llmPort.execute).mockReturnValue(sessionIdEvent);

      const result = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManagerPort.updateClaudeSessionId).toHaveBeenCalledWith(
        'sess-1',
        'new-cs-id',
      );
    });
  });

  describe('executeOneShot', () => {
    it('임시 세션을 생성하고 LLM을 실행한다', () => {
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      const result = service.executeOneShot({ prompt: 'hello' });

      expect(result).toBeInstanceOf(Observable);
      expect(sessionManagerPort.create).toHaveBeenCalled();
      expect(llmPort.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          sessionId: 'temp-1',
          claudeSessionId: null,
        }),
      );
    });

    it('스트림 완료 후 임시 세션을 삭제한다', async () => {
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      const result = service.executeOneShot({ prompt: 'hello' });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManagerPort.remove).toHaveBeenCalledWith('temp-1');
    });

    it('session_id 이벤트가 오면 updateClaudeSessionId를 호출한다', async () => {
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      const sessionIdEvent = of({
        data: { session_id: 'new-cs-id' },
      } as LlmEvent);
      jest.mocked(llmPort.execute).mockReturnValue(sessionIdEvent);

      const result = service.executeOneShot({ prompt: 'hello' });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManagerPort.updateClaudeSessionId).toHaveBeenCalledWith(
        'temp-1',
        'new-cs-id',
      );
    });
  });

  describe('executeSyncWithSession', () => {
    it('세션을 조회하고 이벤트를 수집하여 PromptResult를 반환한다', async () => {
      const session = Session.create('sess-1');
      session.attachClaudeSession('claude-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'hello ' } } as LlmEvent,
        { data: { type: 'text', text: 'world' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      jest.mocked(llmPort.execute).mockReturnValue(events$);

      const result = await service.executeSyncWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result).toBeInstanceOf(PromptResult);
      expect(result!.text).toBe('hello world');
      expect(result!.error).toBeNull();
      expect(result!.exitCode).toBe(0);
      expect(sessionManagerPort.touch).toHaveBeenCalledWith('sess-1');
    });

    it('세션이 없으면 undefined를 반환한다', async () => {
      jest.mocked(sessionReaderPort.findById).mockReturnValue(undefined);

      const result = await service.executeSyncWithSession({
        sessionId: 'nonexistent',
        prompt: 'hello',
      });

      expect(result).toBeUndefined();
      expect(llmPort.execute).not.toHaveBeenCalled();
    });

    it('assistant 타입 이벤트에서 텍스트를 추출한다', async () => {
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const events$ = of(
        {
          data: {
            type: 'assistant',
            message: {
              content: [
                { type: 'text', text: 'hello from assistant' },
              ],
            },
          },
        } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      jest.mocked(llmPort.execute).mockReturnValue(events$);

      const result = await service.executeSyncWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });

      expect(result!.text).toBe('hello from assistant');
    });

    it('에러 이벤트를 캡처한다', async () => {
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'partial' } } as LlmEvent,
        { data: { type: 'error', error: 'something failed' } } as LlmEvent,
        { data: { type: 'done', exitCode: 1 } } as LlmEvent,
      );
      jest.mocked(llmPort.execute).mockReturnValue(events$);

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
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      const events$ = of(
        { data: { type: 'text', text: 'response' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      jest.mocked(llmPort.execute).mockReturnValue(events$);

      const result = await service.executeSyncOneShot({ prompt: 'hello' });

      expect(result).toBeInstanceOf(PromptResult);
      expect(result.text).toBe('response');
      expect(result.exitCode).toBe(0);
      expect(sessionManagerPort.create).toHaveBeenCalled();
    });

    it('완료 후 임시 세션을 삭제한다', async () => {
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      await service.executeSyncOneShot({ prompt: 'hello' });

      expect(sessionManagerPort.remove).toHaveBeenCalledWith('temp-1');
    });

    it('session_id 이벤트가 오면 updateClaudeSessionId를 호출한다', async () => {
      const session = Session.create('temp-1');
      jest.mocked(sessionManagerPort.create).mockReturnValue(session);

      const events$ = of(
        { data: { session_id: 'new-cs-id' } } as LlmEvent,
        { data: { type: 'done', exitCode: 0 } } as LlmEvent,
      );
      jest.mocked(llmPort.execute).mockReturnValue(events$);

      await service.executeSyncOneShot({ prompt: 'hello' });

      expect(sessionManagerPort.updateClaudeSessionId).toHaveBeenCalledWith(
        'temp-1',
        'new-cs-id',
      );
    });
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('스트림 중 heartbeat 이벤트가 주기적으로 방출된다', async () => {
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const source$ = new Subject<LlmEvent>();
      jest.mocked(llmPort.execute).mockReturnValue(source$.asObservable());

      const events: LlmEvent[] = [];
      const result$ = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });
      result$.subscribe((e) => events.push(e));

      jest.advanceTimersByTime(15000);
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual({ type: 'heartbeat' });

      jest.advanceTimersByTime(15000);
      expect(events).toHaveLength(2);

      source$.next({ data: { type: 'done', exitCode: 0 } });
      source$.complete();

      expect(events).toHaveLength(3);
      expect(events[2].data).toEqual({ type: 'done', exitCode: 0 });
    });

    it('소스 완료 후 heartbeat가 중지된다', async () => {
      const session = Session.create('sess-1');
      jest.mocked(sessionReaderPort.findById).mockReturnValue(session);

      const source$ = new Subject<LlmEvent>();
      jest.mocked(llmPort.execute).mockReturnValue(source$.asObservable());

      const events: LlmEvent[] = [];
      const result$ = service.executeWithSession({
        sessionId: 'sess-1',
        prompt: 'hello',
      });
      result$.subscribe((e) => events.push(e));

      source$.complete();
      const countAfterComplete = events.length;

      jest.advanceTimersByTime(30000);
      expect(events).toHaveLength(countAfterComplete);
    });
  });
});
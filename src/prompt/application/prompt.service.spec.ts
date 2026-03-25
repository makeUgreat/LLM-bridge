import { Test, TestingModule } from '@nestjs/testing';
import { Observable, of, firstValueFrom, toArray } from 'rxjs';
import { PromptService } from './prompt.service';
import { LlmPort } from '../domain/llm.port';
import { SessionReaderPort } from '../domain/session-reader.port';
import { SessionManagerPort } from '../domain/session-manager.port';
import { Session } from '../../session/domain/session.entity';

describe('PromptService', () => {
  let service: PromptService;
  let llmPort: LlmPort;
  let sessionReaderPort: SessionReaderPort;
  let sessionManagerPort: SessionManagerPort;

  const mockObservable = of({
    data: { type: 'done', exitCode: 0 },
  } as MessageEvent);

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
      } as MessageEvent);
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
      } as MessageEvent);
      jest.mocked(llmPort.execute).mockReturnValue(sessionIdEvent);

      const result = service.executeOneShot({ prompt: 'hello' });

      await firstValueFrom(result.pipe(toArray()));

      expect(sessionManagerPort.updateClaudeSessionId).toHaveBeenCalledWith(
        'temp-1',
        'new-cs-id',
      );
    });
  });
});

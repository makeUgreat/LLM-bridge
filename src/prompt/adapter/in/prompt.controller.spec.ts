import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { PromptController } from './prompt.controller';
import { PromptService } from '../../application/prompt.service';

describe('PromptController', () => {
  let controller: PromptController;
  let promptService: PromptService;

  const mockObservable = of({
    data: { type: 'done', exitCode: 0 },
  } as MessageEvent);

  const mockPromptService = {
    executeWithSession: jest.fn().mockReturnValue(mockObservable),
    executeOneShot: jest.fn().mockReturnValue(mockObservable),
  };

  beforeEach(async () => {
    mockPromptService.executeWithSession.mockReturnValue(mockObservable);
    mockPromptService.executeOneShot.mockReturnValue(mockObservable);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptController],
      providers: [
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    controller = module.get<PromptController>(PromptController);
    promptService = module.get<PromptService>(PromptService);
  });

  describe('executeWithSession', () => {
    it('정상 실행 시 Observable을 반환한다', () => {
      const result = controller.executeWithSession('sess-1', {
        prompt: 'hello',
      });

      expect(result).toBeInstanceOf(Observable);
      expect(promptService.executeWithSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          prompt: 'hello',
        }),
      );
    });

    it('세션이 존재하지 않으면 NotFoundException을 던진다', () => {
      jest.mocked(promptService.executeWithSession).mockReturnValue(
        undefined as unknown as Observable<MessageEvent>,
      );

      expect(() =>
        controller.executeWithSession('nonexistent', { prompt: 'hello' }),
      ).toThrow(NotFoundException);
    });

    it('prompt가 없으면 BadRequestException을 던진다', () => {
      expect(() =>
        controller.executeWithSession('sess-1', { prompt: '' }),
      ).toThrow(BadRequestException);
    });

    it('optional 필드를 PromptService에 전달한다', () => {
      controller.executeWithSession('sess-1', {
        prompt: 'hello',
        model: 'opus',
        workingDir: '/tmp',
        permissionMode: 'plan',
        allowedTools: ['Read'],
        systemPrompt: 'be nice',
      });

      expect(promptService.executeWithSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'opus',
          workingDir: '/tmp',
          permissionMode: 'plan',
          allowedTools: ['Read'],
          systemPrompt: 'be nice',
        }),
      );
    });
  });

  describe('executeOneShot', () => {
    it('정상 실행 시 Observable을 반환한다', () => {
      const result = controller.executeOneShot({ prompt: 'hello' });

      expect(result).toBeInstanceOf(Observable);
      expect(promptService.executeOneShot).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
        }),
      );
    });

    it('prompt가 없으면 BadRequestException을 던진다', () => {
      expect(() => controller.executeOneShot({ prompt: '' })).toThrow(
        BadRequestException,
      );
    });
  });
});

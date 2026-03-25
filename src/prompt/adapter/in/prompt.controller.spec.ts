import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of, TimeoutError } from 'rxjs';
import { PromptController } from './prompt.controller';
import { PromptService } from '../../application/prompt.service';
import { PromptResult } from '../../domain/prompt-result.vo';
import { LlmEvent } from '../../domain/prompt-event.type';

describe('PromptController', () => {
  let controller: PromptController;
  let promptService: PromptService;

  const mockObservable = of({
    data: { type: 'done', exitCode: 0 },
  } as LlmEvent);

  const mockPromptResult = PromptResult.create({
    text: 'hello world',
    error: null,
    exitCode: 0,
  });

  const mockPromptService = {
    executeWithSession: jest.fn().mockReturnValue(mockObservable),
    executeOneShot: jest.fn().mockReturnValue(mockObservable),
    executeSyncWithSession: jest.fn().mockResolvedValue(mockPromptResult),
    executeSyncOneShot: jest.fn().mockResolvedValue(mockPromptResult),
  };

  beforeEach(async () => {
    mockPromptService.executeWithSession.mockReturnValue(mockObservable);
    mockPromptService.executeOneShot.mockReturnValue(mockObservable);
    mockPromptService.executeSyncWithSession.mockResolvedValue(mockPromptResult);
    mockPromptService.executeSyncOneShot.mockResolvedValue(mockPromptResult);

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
        undefined as unknown as Observable<LlmEvent>,
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

  describe('executeSyncWithSession', () => {
    it('정상 실행 시 JSON 응답을 반환한다', async () => {
      const result = await controller.executeSyncWithSession('sess-1', {
        prompt: 'hello',
      });

      expect(result).toEqual({
        text: 'hello world',
        error: null,
        exitCode: 0,
      });
      expect(promptService.executeSyncWithSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          prompt: 'hello',
        }),
      );
    });

    it('세션이 존재하지 않으면 NotFoundException을 던진다', async () => {
      jest
        .mocked(promptService.executeSyncWithSession)
        .mockResolvedValue(undefined);

      await expect(
        controller.executeSyncWithSession('nonexistent', { prompt: 'hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('prompt가 없으면 BadRequestException을 던진다', async () => {
      await expect(
        controller.executeSyncWithSession('sess-1', { prompt: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('타임아웃 시 504를 반환한다', async () => {
      jest
        .mocked(promptService.executeSyncWithSession)
        .mockRejectedValue(new TimeoutError());

      await expect(
        controller.executeSyncWithSession('sess-1', { prompt: 'hello' }),
      ).rejects.toThrow(
        new HttpException('LLM execution timed out', HttpStatus.GATEWAY_TIMEOUT),
      );
    });
  });

  describe('executeSyncOneShot', () => {
    it('정상 실행 시 JSON 응답을 반환한다', async () => {
      const result = await controller.executeSyncOneShot({ prompt: 'hello' });

      expect(result).toEqual({
        text: 'hello world',
        error: null,
        exitCode: 0,
      });
      expect(promptService.executeSyncOneShot).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
        }),
      );
    });

    it('prompt가 없으면 BadRequestException을 던진다', async () => {
      await expect(
        controller.executeSyncOneShot({ prompt: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('타임아웃 시 504를 반환한다', async () => {
      jest
        .mocked(promptService.executeSyncOneShot)
        .mockRejectedValue(new TimeoutError());

      await expect(
        controller.executeSyncOneShot({ prompt: 'hello' }),
      ).rejects.toThrow(
        new HttpException('LLM execution timed out', HttpStatus.GATEWAY_TIMEOUT),
      );
    });
  });
});
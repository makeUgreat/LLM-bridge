import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of, TimeoutError } from 'rxjs';
import { PromptHttpController } from '@contexts/prompt/presentation/http/prompt-http.controller.js';
import { PromptService } from '@contexts/prompt/application/prompt.service.js';
import { PromptResult, type LlmEvent } from '@contexts/prompt/domain/index.js';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application/index.js';

describe('PromptHttpController', () => {
  let controller: PromptHttpController;
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
    executeWithSession: vi.fn().mockReturnValue(mockObservable),
    executeOneShot: vi.fn().mockReturnValue(mockObservable),
    executeSyncWithSession: vi.fn().mockResolvedValue(mockPromptResult),
    executeSyncOneShot: vi.fn().mockResolvedValue(mockPromptResult),
  };

  beforeEach(async () => {
    mockPromptService.executeWithSession.mockReturnValue(mockObservable);
    mockPromptService.executeOneShot.mockReturnValue(mockObservable);
    mockPromptService.executeSyncWithSession.mockResolvedValue(mockPromptResult);
    mockPromptService.executeSyncOneShot.mockResolvedValue(mockPromptResult);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptHttpController],
      providers: [
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    controller = module.get<PromptHttpController>(PromptHttpController);
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

    it('세션이 존재하지 않으면 ApplicationException(NOT_FOUND)을 던진다', () => {
      vi.mocked(promptService.executeWithSession).mockReturnValue(undefined);

      expect(() =>
        controller.executeWithSession('nonexistent', { prompt: 'hello' }),
      ).toThrow(ApplicationException);
      expect(() =>
        controller.executeWithSession('nonexistent', { prompt: 'hello' }),
      ).toThrow(
        expect.objectContaining({
          error: expect.objectContaining({ kind: APPLICATION_ERROR_KIND.NOT_FOUND }),
        }),
      );
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

    it('세션이 존재하지 않으면 ApplicationException(NOT_FOUND)을 던진다', async () => {
      vi.mocked(promptService.executeSyncWithSession).mockResolvedValue(undefined);

      await expect(
        controller.executeSyncWithSession('nonexistent', { prompt: 'hello' }),
      ).rejects.toThrow(ApplicationException);
    });

    it('타임아웃 시 504를 반환한다', async () => {
      vi.mocked(promptService.executeSyncWithSession).mockRejectedValue(
        new TimeoutError(),
      );

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

    it('타임아웃 시 504를 반환한다', async () => {
      vi.mocked(promptService.executeSyncOneShot).mockRejectedValue(
        new TimeoutError(),
      );

      await expect(
        controller.executeSyncOneShot({ prompt: 'hello' }),
      ).rejects.toThrow(
        new HttpException('LLM execution timed out', HttpStatus.GATEWAY_TIMEOUT),
      );
    });
  });
});

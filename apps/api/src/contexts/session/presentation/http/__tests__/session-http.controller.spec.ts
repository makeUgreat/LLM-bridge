import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { SessionHttpController } from '@contexts/session/presentation/http/session-http.controller';
import { SessionService } from '@contexts/session/application/session.service';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
  type ApplicationErrorBase,
} from '@kernels/application/index';

function isApplicationException(
  error: unknown,
): error is ApplicationException<ApplicationErrorBase> {
  return error instanceof ApplicationException;
}

function sessionFixture(
  id: string,
  claudeSessionId: string | null = null,
): ReturnType<SessionService['create']> {
  const now = new Date();
  return {
    id,
    claudeSessionId,
    createdAt: now,
    lastUsedAt: now,
    attachClaudeSession: vi.fn(),
    touch: vi.fn(),
    isExpired: vi.fn(),
    toJSON: vi.fn(),
  } as unknown as ReturnType<SessionService['create']>;
}

describe('SessionHttpController', () => {
  let controller: SessionHttpController;
  let service: SessionService;

  const mockService = {
    create: vi.fn(),
    findAll: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionHttpController],
      providers: [{ provide: SessionService, useValue: mockService }],
    }).compile();

    controller = module.get<SessionHttpController>(SessionHttpController);
    service = module.get<SessionService>(SessionService);
  });

  describe('create', () => {
    it('sessionId와 createdAt을 반환한다', () => {
      const session = sessionFixture('test-id');
      vi.mocked(service.create).mockReturnValue(session);

      const result = controller.create();

      expect(result.sessionId).toBe('test-id');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('세션 목록을 반환한다', () => {
      const sessions = [sessionFixture('1'), sessionFixture('2')];
      vi.mocked(service.findAll).mockReturnValue(sessions);

      const result = controller.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('존재하는 세션 삭제 시 { deleted: true }를 반환한다', () => {
      vi.mocked(service.remove).mockReturnValue(true);

      expect(controller.remove('id-1')).toEqual({ deleted: true });
    });

    it('존재하지 않는 세션 삭제 시 ApplicationException(NOT_FOUND)을 던진다', () => {
      vi.mocked(service.remove).mockReturnValue(false);

      expect(() => controller.remove('nonexistent')).toThrow(
        ApplicationException,
      );

      try {
        controller.remove('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationException);
        if (isApplicationException(error)) {
          expect(error.error.kind).toBe(APPLICATION_ERROR_KIND.NOT_FOUND);
        }
      }
    });
  });
});

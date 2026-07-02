import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionCleanupService } from '@contexts/session/infrastructure/in-memory/session-cleanup.service.js';
import { type SessionService } from '@contexts/session/application/session.service.js';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let mockSessionService: Pick<SessionService, 'removeExpired'>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSessionService = {
      removeExpired: vi.fn().mockReturnValue(0),
    };
    service = new SessionCleanupService(
      mockSessionService as SessionService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('모듈 초기화 후 주기적으로 removeExpired를 호출한다', () => {
    service.onModuleInit();

    vi.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledTimes(2);
  });

  it('removeExpired에 TTL 값을 전달한다', () => {
    service.onModuleInit();

    vi.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledWith(1800000);
  });

  it('모듈 종료 시 interval이 정지된다', () => {
    service.onModuleInit();
    service.onModuleDestroy();

    vi.advanceTimersByTime(120000);
    expect(mockSessionService.removeExpired).not.toHaveBeenCalled();
  });
});

import { SessionCleanupService } from './session-cleanup.service';
import { SessionService } from '../../application/session.service';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let mockSessionService: Pick<SessionService, 'removeExpired'>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSessionService = {
      removeExpired: jest.fn().mockReturnValue(0),
    };
    service = new SessionCleanupService(
      mockSessionService as SessionService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('모듈 초기화 후 주기적으로 removeExpired를 호출한다', () => {
    service.onModuleInit();

    jest.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledTimes(2);
  });

  it('removeExpired에 TTL 값을 전달한다', () => {
    service.onModuleInit();

    jest.advanceTimersByTime(60000);
    expect(mockSessionService.removeExpired).toHaveBeenCalledWith(1800000);
  });

  it('모듈 종료 시 interval이 정지된다', () => {
    service.onModuleInit();
    service.onModuleDestroy();

    jest.advanceTimersByTime(120000);
    expect(mockSessionService.removeExpired).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { SessionService } from '@contexts/session/application/session.service.js';
import { SessionRepository } from '@contexts/session/domain/index.js';
import { Session } from '@contexts/session/domain/index.js';
import { SESSION_REPOSITORY } from '@contexts/session/session.di-tokens.js';

describe('SessionService', () => {
  let service: SessionService;
  let repository: SessionRepository;

  const mockRepository: SessionRepository = {
    save: vi.fn((session: Session) => session),
    find: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    removeExpired: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SESSION_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = mockRepository;
  });

  describe('create', () => {
    it('새 세션을 생성하고 저장한다', () => {
      const result = service.create();

      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.claudeSessionId).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findOne', () => {
    it('존재하는 세션을 반환한다', () => {
      const session = Session.create('id-1');
      vi.mocked(repository.find).mockReturnValue(session);

      const result = service.findOne('id-1');

      expect(result).toBe(session);
      expect(repository.find).toHaveBeenCalledWith({ id: 'id-1' });
    });

    it('존재하지 않는 세션은 undefined를 반환한다', () => {
      vi.mocked(repository.find).mockReturnValue(undefined);

      expect(service.findOne('nonexistent')).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('모든 세션을 반환한다', () => {
      const sessions = [Session.create('1'), Session.create('2')];
      vi.mocked(repository.list).mockReturnValue(sessions);

      expect(service.findAll()).toEqual(sessions);
    });

    it('세션이 없으면 빈 배열을 반환한다', () => {
      vi.mocked(repository.list).mockReturnValue([]);

      expect(service.findAll()).toEqual([]);
    });
  });

  describe('updateClaudeSessionId', () => {
    it('claudeSessionId를 업데이트하고 저장한다', () => {
      const session = Session.create('id-1');
      vi.mocked(repository.find).mockReturnValue(session);

      service.updateClaudeSessionId('id-1', 'claude-123');

      expect(session.claudeSessionId).toBe('claude-123');
      expect(repository.save).toHaveBeenCalledWith(session);
    });

    it('존재하지 않는 세션은 무시한다', () => {
      vi.mocked(repository.find).mockReturnValue(undefined);

      expect(() => {
        service.updateClaudeSessionId('nonexistent', 'claude-123');
      }).not.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('touch', () => {
    it('lastUsedAt을 갱신하고 저장한다', () => {
      const session = Session.create('id-1');
      vi.mocked(repository.find).mockReturnValue(session);

      service.touch('id-1');

      expect(repository.save).toHaveBeenCalledWith(session);
    });

    it('존재하지 않는 세션은 무시한다', () => {
      vi.mocked(repository.find).mockReturnValue(undefined);

      expect(() => service.touch('nonexistent')).not.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('세션을 삭제하고 true를 반환한다', () => {
      vi.mocked(repository.remove).mockReturnValue(true);

      expect(service.remove('id-1')).toBe(true);
      expect(repository.remove).toHaveBeenCalledWith('id-1');
    });

    it('존재하지 않는 세션 삭제 시 false를 반환한다', () => {
      vi.mocked(repository.remove).mockReturnValue(false);

      expect(service.remove('nonexistent')).toBe(false);
    });
  });

  describe('removeExpired', () => {
    it('repository에 위임하고 삭제 건수를 반환한다', () => {
      vi.mocked(repository.removeExpired).mockReturnValue(3);

      expect(service.removeExpired(30000)).toBe(3);
      expect(repository.removeExpired).toHaveBeenCalledWith(30000);
    });
  });
});

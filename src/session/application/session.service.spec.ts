import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { SessionRepositoryPort } from '../domain/session-repository.port';
import { Session } from '../domain/session.entity';

describe('SessionService', () => {
  let service: SessionService;
  let repository: SessionRepositoryPort;

  const mockRepository: SessionRepositoryPort = {
    save: jest.fn((session: Session) => session),
    findById: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepositoryPort, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = module.get<SessionRepositoryPort>(SessionRepositoryPort);
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
      jest.mocked(repository.findById).mockReturnValue(session);

      const result = service.findOne('id-1');

      expect(result).toBe(session);
      expect(repository.findById).toHaveBeenCalledWith('id-1');
    });

    it('존재하지 않는 세션은 undefined를 반환한다', () => {
      jest.mocked(repository.findById).mockReturnValue(undefined);

      expect(service.findOne('nonexistent')).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('모든 세션을 반환한다', () => {
      const sessions = [Session.create('1'), Session.create('2')];
      jest.mocked(repository.findAll).mockReturnValue(sessions);

      expect(service.findAll()).toEqual(sessions);
    });

    it('세션이 없으면 빈 배열을 반환한다', () => {
      jest.mocked(repository.findAll).mockReturnValue([]);

      expect(service.findAll()).toEqual([]);
    });
  });

  describe('updateClaudeSessionId', () => {
    it('claudeSessionId를 업데이트하고 저장한다', () => {
      const session = Session.create('id-1');
      jest.mocked(repository.findById).mockReturnValue(session);

      service.updateClaudeSessionId('id-1', 'claude-123');

      expect(session.claudeSessionId).toBe('claude-123');
      expect(repository.save).toHaveBeenCalledWith(session);
    });

    it('존재하지 않는 세션은 무시한다', () => {
      jest.mocked(repository.findById).mockReturnValue(undefined);

      expect(() => {
        service.updateClaudeSessionId('nonexistent', 'claude-123');
      }).not.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('touch', () => {
    it('lastUsedAt을 갱신하고 저장한다', () => {
      const session = Session.create('id-1');
      jest.mocked(repository.findById).mockReturnValue(session);

      service.touch('id-1');

      expect(repository.save).toHaveBeenCalledWith(session);
    });

    it('존재하지 않는 세션은 무시한다', () => {
      jest.mocked(repository.findById).mockReturnValue(undefined);

      expect(() => service.touch('nonexistent')).not.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('세션을 삭제하고 true를 반환한다', () => {
      jest.mocked(repository.remove).mockReturnValue(true);

      expect(service.remove('id-1')).toBe(true);
      expect(repository.remove).toHaveBeenCalledWith('id-1');
    });

    it('존재하지 않는 세션 삭제 시 false를 반환한다', () => {
      jest.mocked(repository.remove).mockReturnValue(false);

      expect(service.remove('nonexistent')).toBe(false);
    });
  });
});

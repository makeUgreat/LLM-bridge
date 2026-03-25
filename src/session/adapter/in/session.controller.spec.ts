import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from '../../application/session.service';
import { Session } from '../../domain/session.entity';

describe('SessionController', () => {
  let controller: SessionController;
  let service: SessionService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockService }],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get<SessionService>(SessionService);
  });

  describe('create', () => {
    it('sessionId와 createdAt을 반환한다', () => {
      const session = Session.create('test-id');
      jest.mocked(service.create).mockReturnValue(session);

      const result = controller.create();

      expect(result.sessionId).toBe('test-id');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('세션 목록을 반환한다', () => {
      const sessions = [Session.create('1'), Session.create('2')];
      jest.mocked(service.findAll).mockReturnValue(sessions);

      const result = controller.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('존재하는 세션 삭제 시 { deleted: true }를 반환한다', () => {
      jest.mocked(service.remove).mockReturnValue(true);

      expect(controller.remove('id-1')).toEqual({ deleted: true });
    });

    it('존재하지 않는 세션 삭제 시 NotFoundException을 던진다', () => {
      jest.mocked(service.remove).mockReturnValue(false);

      expect(() => controller.remove('nonexistent')).toThrow(NotFoundException);
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

describe("SessionController", () => {
  let controller: SessionController;
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [SessionService],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get<SessionService>(SessionService);
  });

  describe("create", () => {
    it("sessionId와 createdAt을 반환한다", () => {
      const result = controller.create();

      expect(result.sessionId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findAll", () => {
    it("세션 목록을 반환한다", () => {
      service.create();
      service.create();

      const result = controller.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe("remove", () => {
    it("존재하는 세션 삭제 시 { deleted: true }를 반환한다", () => {
      const session = service.create();

      expect(controller.remove(session.id)).toEqual({ deleted: true });
    });

    it("존재하지 않는 세션 삭제 시 NotFoundException을 던진다", () => {
      expect(() => controller.remove("nonexistent")).toThrow(NotFoundException);
    });
  });
});

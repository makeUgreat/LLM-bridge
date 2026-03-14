import { Test, TestingModule } from "@nestjs/testing";
import { SessionService } from "./session.service";

describe("SessionService", () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe("create", () => {
    it("새 세션을 생성하고 반환한다", () => {
      const session = service.create();

      expect(session.id).toBeDefined();
      expect(session.claudeSessionId).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastUsedAt).toBeInstanceOf(Date);
    });

    it("생성된 세션이 내부 저장소에 추가된다", () => {
      const session = service.create();

      expect(service.findOne(session.id)).toEqual(session);
    });
  });

  describe("findOne", () => {
    it("존재하는 세션을 반환한다", () => {
      const created = service.create();
      const found = service.findOne(created.id);

      expect(found).toEqual(created);
    });

    it("존재하지 않는 세션은 undefined를 반환한다", () => {
      expect(service.findOne("nonexistent")).toBeUndefined();
    });
  });

  describe("findAll", () => {
    it("세션이 없으면 빈 배열을 반환한다", () => {
      expect(service.findAll()).toEqual([]);
    });

    it("생성된 모든 세션을 반환한다", () => {
      const s1 = service.create();
      const s2 = service.create();

      expect(service.findAll()).toEqual([s1, s2]);
    });
  });

  describe("updateClaudeSessionId", () => {
    it("claudeSessionId와 lastUsedAt을 업데이트한다", () => {
      const session = service.create();
      const originalLastUsedAt = session.lastUsedAt;

      service.updateClaudeSessionId(session.id, "claude-123");

      const updated = service.findOne(session.id)!;
      expect(updated.claudeSessionId).toBe("claude-123");
      expect(updated.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
        originalLastUsedAt.getTime()
      );
    });

    it("존재하지 않는 세션은 무시한다", () => {
      expect(() => {
        service.updateClaudeSessionId("nonexistent", "claude-123");
      }).not.toThrow();
    });
  });

  describe("remove", () => {
    it("세션을 삭제하고 true를 반환한다", () => {
      const session = service.create();

      expect(service.remove(session.id)).toBe(true);
      expect(service.findOne(session.id)).toBeUndefined();
    });

    it("존재하지 않는 세션 삭제 시 false를 반환한다", () => {
      expect(service.remove("nonexistent")).toBe(false);
    });
  });
});

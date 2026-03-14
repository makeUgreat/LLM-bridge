import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { PromptController } from "./prompt.controller";
import { ClaudeService } from "./claude.service";
import { SessionService } from "../session/session.service";

describe("PromptController", () => {
  let controller: PromptController;
  let sessionService: SessionService;
  let claudeService: ClaudeService;

  const mockObservable = of({
    data: { type: "done", exitCode: 0 },
  } as MessageEvent);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromptController],
      providers: [
        SessionService,
        {
          provide: ClaudeService,
          useValue: {
            execute: jest.fn().mockReturnValue(mockObservable),
          },
        },
      ],
    }).compile();

    controller = module.get<PromptController>(PromptController);
    sessionService = module.get<SessionService>(SessionService);
    claudeService = module.get<ClaudeService>(ClaudeService);
  });

  describe("executeWithSession", () => {
    it("정상 실행 시 Observable을 반환한다", () => {
      const session = sessionService.create();

      const result = controller.executeWithSession(session.id, {
        prompt: "hello",
      });

      expect(result).toBeInstanceOf(Observable);
      expect(claudeService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "hello",
          sessionId: session.id,
          claudeSessionId: session.claudeSessionId,
        })
      );
    });

    it("실행 시 lastUsedAt을 갱신한다", () => {
      const session = sessionService.create();
      const originalLastUsedAt = session.lastUsedAt;

      controller.executeWithSession(session.id, { prompt: "hello" });

      const updated = sessionService.findOne(session.id)!;
      expect(updated.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
        originalLastUsedAt.getTime()
      );
    });

    it("존재하지 않는 세션이면 NotFoundException을 던진다", () => {
      expect(() =>
        controller.executeWithSession("nonexistent", { prompt: "hello" })
      ).toThrow(NotFoundException);
    });

    it("prompt가 없으면 BadRequestException을 던진다", () => {
      const session = sessionService.create();

      expect(() =>
        controller.executeWithSession(session.id, { prompt: "" })
      ).toThrow(BadRequestException);
    });

    it("optional 필드를 ClaudeService에 전달한다", () => {
      const session = sessionService.create();

      controller.executeWithSession(session.id, {
        prompt: "hello",
        model: "opus",
        workingDir: "/tmp",
        permissionMode: "plan",
        allowedTools: ["Read"],
        systemPrompt: "be nice",
      });

      expect(claudeService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "opus",
          workingDir: "/tmp",
          permissionMode: "plan",
          allowedTools: ["Read"],
          systemPrompt: "be nice",
        })
      );
    });
  });

  describe("executeOneShot", () => {
    it("임시 세션을 생성하고 실행한다", () => {
      const result = controller.executeOneShot({ prompt: "hello" });

      expect(result).toBeInstanceOf(Observable);
      expect(claudeService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "hello",
          claudeSessionId: null,
        })
      );
    });

    it("prompt가 없으면 BadRequestException을 던진다", () => {
      expect(() => controller.executeOneShot({ prompt: "" })).toThrow(
        BadRequestException
      );
    });
  });
});

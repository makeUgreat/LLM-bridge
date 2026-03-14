import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Observable } from "rxjs";
import { AppModule } from "../src/app.module";
import { LlmPort } from "../src/prompt/domain/llm.port";

describe("PromptController (e2e)", () => {
  let app: INestApplication;
  let mockLlmExecute: jest.Mock;

  beforeAll(async () => {
    mockLlmExecute = jest.fn().mockReturnValue(
      new Observable((subscriber) => {
        subscriber.next({
          data: { type: "text", text: "mock response" },
        } as MessageEvent);
        subscriber.next({
          data: { type: "done", exitCode: 0 },
        } as MessageEvent);
        subscriber.complete();
      })
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LlmPort)
      .useValue({ execute: mockLlmExecute })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockLlmExecute.mockClear();
  });

  describe("POST /sessions/:id/prompt", () => {
    it("존재하지 않는 세션이면 404를 반환한다", () => {
      return request(app.getHttpServer())
        .post("/sessions/nonexistent/prompt")
        .send({ prompt: "hello" })
        .expect(404);
    });

    it("prompt가 없으면 400을 반환한다", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/sessions")
        .expect(201);

      return request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt`)
        .send({ prompt: "" })
        .expect(400);
    });

    it("정상 요청 시 SSE 응답을 반환한다", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/sessions")
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt`)
        .send({ prompt: "hello" })
        .expect(201);

      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: "hello" })
      );
    });
  });

  describe("POST /prompt", () => {
    it("prompt가 없으면 400을 반환한다", () => {
      return request(app.getHttpServer())
        .post("/prompt")
        .send({ prompt: "" })
        .expect(400);
    });

    it("정상 요청 시 SSE 응답을 반환한다", async () => {
      const res = await request(app.getHttpServer())
        .post("/prompt")
        .send({ prompt: "hello" })
        .expect(201);

      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "hello",
          claudeSessionId: null,
        })
      );
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("SessionController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /sessions → 세션 생성", () => {
    return request(app.getHttpServer())
      .post("/sessions")
      .expect(201)
      .expect((res) => {
        expect(res.body.sessionId).toBeDefined();
        expect(res.body.createdAt).toBeDefined();
      });
  });

  it("GET /sessions → 빈 배열 반환 (초기 상태)", async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const freshApp = moduleFixture.createNestApplication();
    await freshApp.init();

    await request(freshApp.getHttpServer())
      .get("/sessions")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    await freshApp.close();
  });

  it("GET /sessions → 생성된 세션 포함", async () => {
    await request(app.getHttpServer()).post("/sessions");

    return request(app.getHttpServer())
      .get("/sessions")
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].id).toBeDefined();
      });
  });

  it("DELETE /sessions/:id → 존재하는 세션 삭제 시 200", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/sessions")
      .expect(201);

    return request(app.getHttpServer())
      .delete(`/sessions/${createRes.body.sessionId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ deleted: true });
      });
  });

  it("DELETE /sessions/:id → 존재하지 않는 세션 삭제 시 404", () => {
    return request(app.getHttpServer())
      .delete("/sessions/nonexistent")
      .expect(404);
  });
});

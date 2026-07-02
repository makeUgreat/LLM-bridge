import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { type Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '@platform/nest/app.module';
import {
  type CreateSessionHttpResponse,
  type SessionHttpResponse,
} from '@contexts/session/presentation/http/dto/session.http.dto';

function serverOf(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

function responseBody<T>(body: unknown): T {
  return body as T;
}

describe('SessionHttpController (e2e)', () => {
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

  it('POST /sessions → 세션 생성', () => {
    return request(serverOf(app))
      .post('/sessions')
      .expect(201)
      .expect((res) => {
        const body = responseBody<CreateSessionHttpResponse>(res.body);
        expect(body.sessionId).toBeDefined();
        expect(body.createdAt).toBeDefined();
      });
  });

  it('GET /sessions → 빈 배열 반환 (초기 상태)', async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const freshApp = moduleFixture.createNestApplication();
    await freshApp.init();

    await request(serverOf(freshApp))
      .get('/sessions')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });

    await freshApp.close();
  });

  it('GET /sessions → 생성된 세션 포함', async () => {
    await request(serverOf(app)).post('/sessions');

    return request(serverOf(app))
      .get('/sessions')
      .expect(200)
      .expect((res) => {
        const body = responseBody<SessionHttpResponse[]>(res.body);
        expect(body.length).toBeGreaterThanOrEqual(1);
        expect(body[0]?.id).toBeDefined();
      });
  });

  it('DELETE /sessions/:id → 존재하는 세션 삭제 시 200', async () => {
    const createRes = await request(serverOf(app))
      .post('/sessions')
      .expect(201);
    const createBody = responseBody<CreateSessionHttpResponse>(createRes.body);

    return request(serverOf(app))
      .delete(`/sessions/${createBody.sessionId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ deleted: true });
      });
  });

  it('DELETE /sessions/:id → 존재하지 않는 세션 삭제 시 404', () => {
    return request(serverOf(app)).delete('/sessions/nonexistent').expect(404);
  });
});

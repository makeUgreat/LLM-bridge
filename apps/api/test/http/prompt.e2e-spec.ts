import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { type Server } from 'node:http';
import request from 'supertest';
import { Observable } from 'rxjs';
import { AppModule } from '@platform/nest/app.module';
import { LLM_EXECUTOR } from '@contexts/prompt/prompt.di-tokens';
import { type LlmEvent } from '@contexts/prompt/domain/index';
import { type SyncPromptHttpResponse } from '@contexts/prompt/presentation/http/dto/prompt.http.dto';
import { type CreateSessionHttpResponse } from '@contexts/session/presentation/http/dto/session.http.dto';

function serverOf(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

function responseBody<T>(body: unknown): T {
  return body as T;
}

describe('PromptHttpController (e2e)', () => {
  let app: INestApplication;
  let mockLlmExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    mockLlmExecute = vi.fn().mockReturnValue(
      new Observable<LlmEvent>((subscriber) => {
        subscriber.next({ data: { type: 'text', text: 'mock response' } });
        subscriber.next({ data: { type: 'done', exitCode: 0 } });
        subscriber.complete();
      }),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(LLM_EXECUTOR)
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

  describe('POST /sessions/:id/prompt', () => {
    it('존재하지 않는 세션이면 404를 반환한다', () => {
      return request(serverOf(app))
        .post('/sessions/nonexistent/prompt')
        .send({ prompt: 'hello' })
        .expect(404);
    });

    it('prompt가 없으면 400을 반환한다', async () => {
      const createRes = await request(serverOf(app))
        .post('/sessions')
        .expect(201);
      const createBody = responseBody<CreateSessionHttpResponse>(
        createRes.body,
      );

      return request(serverOf(app))
        .post(`/sessions/${createBody.sessionId}/prompt`)
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 SSE 응답을 반환한다', async () => {
      const createRes = await request(serverOf(app))
        .post('/sessions')
        .expect(201);
      const createBody = responseBody<CreateSessionHttpResponse>(
        createRes.body,
      );

      await request(serverOf(app))
        .post(`/sessions/${createBody.sessionId}/prompt`)
        .send({ prompt: 'hello' })
        .expect(201);

      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'hello' }),
      );
    });
  });

  describe('POST /prompt', () => {
    it('prompt가 없으면 400을 반환한다', () => {
      return request(serverOf(app))
        .post('/prompt')
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 SSE 응답을 반환한다', async () => {
      await request(serverOf(app))
        .post('/prompt')
        .send({ prompt: 'hello' })
        .expect(201);

      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          claudeSessionId: null,
        }),
      );
    });
  });

  describe('POST /sessions/:id/prompt/sync', () => {
    it('존재하지 않는 세션이면 404를 반환한다', () => {
      return request(serverOf(app))
        .post('/sessions/nonexistent/prompt/sync')
        .send({ prompt: 'hello' })
        .expect(404);
    });

    it('prompt가 없으면 400을 반환한다', async () => {
      const createRes = await request(serverOf(app))
        .post('/sessions')
        .expect(201);
      const createBody = responseBody<CreateSessionHttpResponse>(
        createRes.body,
      );

      return request(serverOf(app))
        .post(`/sessions/${createBody.sessionId}/prompt/sync`)
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 JSON 응답을 반환한다', async () => {
      const createRes = await request(serverOf(app))
        .post('/sessions')
        .expect(201);
      const createBody = responseBody<CreateSessionHttpResponse>(
        createRes.body,
      );

      const res = await request(serverOf(app))
        .post(`/sessions/${createBody.sessionId}/prompt/sync`)
        .send({ prompt: 'hello' })
        .expect(200);
      const body = responseBody<SyncPromptHttpResponse>(res.body);

      expect(body).toEqual(
        expect.objectContaining({
          text: 'mock response',
          error: null,
          exitCode: 0,
        }),
      );
    });
  });

  describe('POST /prompt/sync', () => {
    it('prompt가 없으면 400을 반환한다', () => {
      return request(serverOf(app))
        .post('/prompt/sync')
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 JSON 응답을 반환한다', async () => {
      const res = await request(serverOf(app))
        .post('/prompt/sync')
        .send({ prompt: 'hello' })
        .expect(200);
      const body = responseBody<SyncPromptHttpResponse>(res.body);

      expect(body).toEqual(
        expect.objectContaining({
          text: 'mock response',
          error: null,
          exitCode: 0,
        }),
      );
      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'hello',
          claudeSessionId: null,
        }),
      );
    });
  });
});

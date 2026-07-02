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
import request from 'supertest';
import { Observable } from 'rxjs';
import { AppModule } from '@platform/nest/app.module.js';
import { LLM_EXECUTOR } from '@contexts/prompt/prompt.di-tokens.js';
import { type LlmEvent } from '@contexts/prompt/domain/index.js';

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
      return request(app.getHttpServer())
        .post('/sessions/nonexistent/prompt')
        .send({ prompt: 'hello' })
        .expect(404);
    });

    it('prompt가 없으면 400을 반환한다', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .expect(201);

      return request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt`)
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 SSE 응답을 반환한다', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .expect(201);

      await request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt`)
        .send({ prompt: 'hello' })
        .expect(201);

      expect(mockLlmExecute).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'hello' }),
      );
    });
  });

  describe('POST /prompt', () => {
    it('prompt가 없으면 400을 반환한다', () => {
      return request(app.getHttpServer())
        .post('/prompt')
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 SSE 응답을 반환한다', async () => {
      await request(app.getHttpServer())
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
      return request(app.getHttpServer())
        .post('/sessions/nonexistent/prompt/sync')
        .send({ prompt: 'hello' })
        .expect(404);
    });

    it('prompt가 없으면 400을 반환한다', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .expect(201);

      return request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt/sync`)
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 JSON 응답을 반환한다', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/sessions/${createRes.body.sessionId}/prompt/sync`)
        .send({ prompt: 'hello' })
        .expect(200);

      expect(res.body).toEqual(
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
      return request(app.getHttpServer())
        .post('/prompt/sync')
        .send({ prompt: '' })
        .expect(400);
    });

    it('정상 요청 시 JSON 응답을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/prompt/sync')
        .send({ prompt: 'hello' })
        .expect(200);

      expect(res.body).toEqual(
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

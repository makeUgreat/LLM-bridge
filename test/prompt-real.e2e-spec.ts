import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Prompt 실제 Claude CLI 호출 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /prompt → 실제 Claude 응답을 SSE로 수신한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/prompt')
      .send({
        prompt: 'say hello',
        permissionMode: 'plan',
      })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => callback(null, data));
      })
      .expect(201);

    const raw: string = res.body;
    const events = raw
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => {
        try {
          return JSON.parse(line.slice('data: '.length));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    expect(events.length).toBeGreaterThanOrEqual(2);

    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent.exitCode).toBe(0);

    const hasContent = events.some(
      (e) =>
        (e.type === 'assistant' && e.message?.content?.length > 0) ||
        (e.type === 'text' && e.text),
    );
    expect(hasContent).toBe(true);
  }, 60_000);
});

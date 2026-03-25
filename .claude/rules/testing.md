# 테스트 가이드

## 파일 구조 컨벤션

```
src/
  session/
    domain/
      session.entity.ts
      session.entity.spec.ts           # unit test (도메인)
      session-repository.port.ts
    application/
      session.service.ts
      session.service.spec.ts          # unit test (서비스)
    adapter/
      in/
        session.controller.ts
        session.controller.spec.ts     # unit test (컨트롤러)
      out/
        in-memory-session.repository.ts
        in-memory-session.repository.spec.ts
    session.module.ts
  prompt/
    domain/
      claude-options.vo.ts
      llm.port.ts
      session-reader.port.ts
    application/
      prompt.service.ts
      prompt.service.spec.ts
    adapter/
      in/
        prompt.controller.ts
        prompt.controller.spec.ts
      out/
        claude-cli.adapter.ts
        claude-cli.adapter.spec.ts
    prompt.module.ts
test/
  jest-e2e.json
  session.e2e-spec.ts                  # e2e test
  prompt.e2e-spec.ts                   # e2e test
```

- Unit 테스트: 대상 파일과 같은 디렉토리에 `*.spec.ts`로 생성 (레이어별 경로에 맞춤)
- E2E 테스트: 프로젝트 루트의 `test/` 디렉토리에 `*.e2e-spec.ts`로 생성

## 테스트 종류별 목적과 범위

### Unit 테스트

| 항목 | 내용 |
|------|------|
| **목적** | 개별 클래스·함수의 로직이 명세대로 동작하는지 검증 |
| **범위** | 단일 서비스, 컨트롤러, 유틸 함수 등 하나의 유닛 |
| **외부 의존성** | mock/stub으로 대체 — DB, 네트워크, 파일시스템, 외부 프로세스에 접근하지 않는다 |
| **속도 기대치** | 전체 unit suite가 수 초 내에 완료되어야 한다 |
| **검증 초점** | 입력 → 출력 매핑, 분기 로직, 예외 발생 조건, 경계값 |

### E2E 테스트

| 항목 | 내용 |
|------|------|
| **목적** | 사용자 관점에서 HTTP 요청-응답 흐름이 올바른지 검증 |
| **범위** | 전체 애플리케이션 모듈을 부트스트랩하여 실제 라우팅·파이프·가드·인터셉터가 동작하는 환경 |
| **외부 의존성** | 외부 프로세스(`ClaudeService` 등)는 mock하되, NestJS 내부 모듈 간 연결은 실제 wiring 사용 |
| **속도 기대치** | 개별 케이스 수백 ms 이내, 전체 suite는 수십 초 이내 |
| **검증 초점** | 상태 코드, 응답 body 구조, 인증/인가 흐름, 에러 응답 포맷 |

### Unit vs E2E 판단 기준

- **"이 동작이 단일 클래스 안에서 완결되는가?"** → Yes면 unit 테스트
- **"모듈 간 조합·HTTP 계층이 관여하는가?"** → Yes면 E2E 테스트
- 하나의 기능에 대해 양쪽 모두 작성할 수 있다 — unit으로 분기 로직을 촘촘히 커버하고, E2E로 통합 경로를 확인하는 것이 이상적이다

## Unit 테스트 패턴

### 서비스 테스트 (SessionService 예시)

외부 의존성이 없는 순수 서비스는 `TestingModule` 없이 직접 인스턴스화해도 된다.
의존성 주입이 필요한 경우에만 `TestingModule`을 사용한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('create', () => {
    it('새 세션을 생성하고 반환한다', () => {
      const session = service.create();

      expect(session.id).toBeDefined();
      expect(session.claudeSessionId).toBeNull();
      expect(session.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findOne', () => {
    it('존재하는 세션을 반환한다', () => {
      const created = service.create();
      const found = service.findOne(created.id);

      expect(found).toEqual(created);
    });

    it('존재하지 않는 세션은 undefined를 반환한다', () => {
      expect(service.findOne('nonexistent')).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('세션을 삭제하고 true를 반환한다', () => {
      const session = service.create();

      expect(service.remove(session.id)).toBe(true);
      expect(service.findOne(session.id)).toBeUndefined();
    });
  });
});
```

### 컨트롤러 테스트 (SessionController 예시)

컨트롤러 테스트에서는 서비스를 mock하여 HTTP 핸들러 로직만 검증한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
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

  describe('create', () => {
    it('세션을 생성하고 id와 createdAt을 반환한다', () => {
      const result = controller.create();

      expect(result.sessionId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('존재하지 않는 세션 삭제 시 NotFoundException을 던진다', () => {
      expect(() => controller.remove('nonexistent')).toThrow(NotFoundException);
    });
  });
});
```

## E2E 테스트 패턴

supertest를 사용하여 실제 HTTP 요청/응답을 검증한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('SessionController (e2e)', () => {
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
    return request(app.getHttpServer())
      .post('/sessions')
      .expect(201)
      .expect((res) => {
        expect(res.body.sessionId).toBeDefined();
      });
  });

  it('DELETE /sessions/:id → 존재하지 않는 세션 삭제 시 404', () => {
    return request(app.getHttpServer())
      .delete('/sessions/nonexistent')
      .expect(404);
  });
});
```

## Mocking 전략

### ClaudeService (외부 프로세스 의존성)

`ClaudeService`는 `child_process.spawn`으로 Claude CLI를 실행하므로,
테스트 시 `spawn`을 mock하거나 서비스 자체를 mock한다.

**방법 1: 서비스 레벨 mock (권장)**

컨트롤러 테스트에서 `ClaudeService`를 통째로 mock한다.

```typescript
const mockClaudeService = {
  execute: jest.fn().mockReturnValue(
    new Observable((subscriber) => {
      subscriber.next({ data: { type: 'text', text: 'mock response' } } as MessageEvent);
      subscriber.next({ data: { type: 'done', exitCode: 0 } } as MessageEvent);
      subscriber.complete();
    })
  ),
};

const module = await Test.createTestingModule({
  controllers: [PromptController],
  providers: [
    SessionService,
    { provide: ClaudeService, useValue: mockClaudeService },
  ],
}).compile();
```

**방법 2: spawn mock (ClaudeService 단위 테스트)**

`child_process.spawn`을 jest.mock으로 대체하여 stdout/stderr 이벤트를 시뮬레이션한다.

```typescript
import { EventEmitter } from 'events';

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const proc = new EventEmitter() as any;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.killed = false;
    proc.kill = jest.fn();

    // 비동기로 데이터 전송 시뮬레이션
    process.nextTick(() => {
      proc.stdout.emit('data', Buffer.from('{"type":"text","text":"hello"}\n'));
      proc.emit('close', 0);
    });

    return proc;
  }),
}));
```

### 포트 mock (헥사고날 아키텍처)

application service 테스트에서 포트(abstract class)를 mock하여 도메인 로직만 검증한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { SessionRepositoryPort } from '../domain/session-repository.port';
import { Session } from '../domain/session.entity';

describe('SessionService', () => {
  let service: SessionService;
  let repository: SessionRepositoryPort;

  const mockRepository: SessionRepositoryPort = {
    save: jest.fn(),
    findById: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepositoryPort, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    repository = module.get<SessionRepositoryPort>(SessionRepositoryPort);
  });

  it('세션을 생성하고 저장한다', () => {
    const session = new Session('id-1', null, new Date(), new Date());
    jest.mocked(repository.save).mockReturnValue(session);

    const result = service.create();

    expect(repository.save).toHaveBeenCalled();
    expect(result.id).toBe('id-1');
  });
});
```

E2E 테스트에서도 포트 단위로 mock을 주입한다:

```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(LlmPort)
  .useValue(mockLlmAdapter)
  .compile();
```

## 테스트 작성 원칙

1. **테스트 설명은 한글로 작성**: `it('새 세션을 생성하고 반환한다', ...)`
2. **Arrange-Act-Assert 패턴 준수**: 준비 → 실행 → 검증 순서를 지킨다
3. **테스트당 하나의 행위 검증**: 하나의 `it` 블록에서 하나의 동작만 확인한다
4. **프로덕션 코드와 같은 커밋에 포함**: CLAUDE.md 커밋 컨벤션에 따라, 기능 코드와 테스트 코드를 같은 커밋에 넣는다
5. **테스트만 추가/수정할 때는 `test` type 사용**: 프로덕션 코드 변경 없이 테스트만 변경하는 경우 `test(scope): ...` 형식을 사용한다
6. **테스트 격리**: 각 테스트는 독립적으로 실행 가능해야 하며, 다른 테스트의 상태에 의존하지 않는다

## 커버리지 정책

### 임계값

statements, branches, functions, lines 모두 **80% 이상**을 유지한다.

### 측정 대상

- `src/` 하위 `.ts` 파일
- **제외**: `main.ts`, `*.module.ts` 등 로직이 없는 설정/부트스트랩 파일

### 실행 명령어

```bash
npm run test:cov
```

### 원칙

1. **새 코드는 임계값 이상**: 새 기능 추가나 버그 수정 시 해당 코드의 커버리지가 임계값(80%) 이상이어야 한다
2. **무의미한 테스트 지양**: 커버리지 숫자를 채우기 위한 구현 세부사항 검증, getter/setter만 호출하는 테스트는 작성하지 않는다
3. **분기 커버리지 우선**: 에러 경로, 경계값, 엣지 케이스를 우선 커버한다 — branch coverage가 가장 실질적인 품질 지표다
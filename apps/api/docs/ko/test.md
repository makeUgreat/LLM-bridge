# 테스트

영어 미러: [en/test.md](../en/test.md)

## 실행기

**Vitest** + SWC 트랜스폼 (TypeScript + 데코레이터). `vitest.config.ts`에 두 개의 프로젝트가 설정됩니다:

| 프로젝트 | 패턴 | 목적 |
|---------|------|------|
| `unit` | `src/**/*.spec.ts` | 빠른 격리된 유닛 테스트 |
| `integration` | `test/**/*.e2e-spec.ts` | HTTP를 통한 전체 NestJS 앱 테스트 |

## 파일 배치

```
src/
  contexts/
    session/
      domain/__tests__/session.entity.spec.ts
      application/__tests__/session.service.spec.ts
      infrastructure/in-memory/__tests__/in-memory-session.repository.spec.ts
      presentation/http/__tests__/session-http.controller.spec.ts
    prompt/
      domain/__tests__/claude-options.vo.spec.ts
      application/__tests__/prompt.service.spec.ts
      infrastructure/claude-cli/__tests__/claude-cli.adapter.spec.ts
      presentation/http/__tests__/prompt-http.controller.spec.ts
test/
  http/
    session.e2e-spec.ts
    prompt.e2e-spec.ts
```

## import

항상 `vitest`에서 import합니다 (`@jest/globals` 금지):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
```

## Mocking

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.mocked(x)` | `vi.mocked(x)` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.advanceTimersByTime(n)` | `vi.advanceTimersByTime(n)` |
| `jest.mock('module')` | `vi.mock('module')` |

## 애플리케이션 서비스 포트 모킹

Symbol DI 토큰으로 mock 값을 주입합니다:

```typescript
await Test.createTestingModule({
  providers: [
    PromptService,
    { provide: LLM_EXECUTOR,   useValue: { execute: vi.fn() } },
    { provide: SESSION_READER,  useValue: { find: vi.fn() } },
    { provide: SESSION_MANAGER, useValue: { create: vi.fn(), ... } },
  ],
}).compile();
```

## E2E 테스트 설정

`LLM_EXECUTOR` 토큰을 오버라이드하여 실제 Claude CLI가 실행되지 않도록 합니다:

```typescript
await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(LLM_EXECUTOR)
  .useValue({ execute: vi.fn().mockReturnValue(mockObservable) })
  .compile();
```

## 커버리지

임계값: statements, branches, functions, lines 모두 **80% 이상**.

실행: `pnpm test:cov`

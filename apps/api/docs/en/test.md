# Testing

Korean mirror: [ko/test.md](../ko/test.md)

## Runner

**Vitest** with SWC transform for TypeScript + decorators. Two projects are configured in `vitest.config.ts`:

| Project | Pattern | Purpose |
|---------|---------|---------|
| `unit` | `src/**/*.spec.ts` | Fast, isolated unit tests |
| `integration` | `test/**/*.e2e-spec.ts` | Full NestJS app tests via HTTP |

## File Placement

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

## Imports

Always import from `vitest`, never from `@jest/globals`:

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

## Mocking Ports in Application Service Tests

Inject mock values via Symbol DI tokens:

```typescript
await Test.createTestingModule({
  providers: [
    PromptService,
    { provide: LLM_EXECUTOR, useValue: { execute: vi.fn() } },
    { provide: SESSION_READER, useValue: { find: vi.fn() } },
    { provide: SESSION_MANAGER, useValue: { create: vi.fn(), ... } },
  ],
}).compile();
```

## E2E Test Setup

Override the `LLM_EXECUTOR` token so the real Claude CLI is never spawned:

```typescript
await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(LLM_EXECUTOR)
  .useValue({ execute: vi.fn().mockReturnValue(mockObservable) })
  .compile();
```

## Coverage

Thresholds: **80%** for statements, branches, functions, lines.

Run: `pnpm test:cov`

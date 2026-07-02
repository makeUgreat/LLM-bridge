# Runtime Wiring

Korean mirror: [ko/runtime-wiring.md](../ko/runtime-wiring.md)

## DI Token Convention

Every bounded context exposes a `*.di-tokens.ts` file with `Symbol` constants:

```typescript
// session.di-tokens.ts
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const SESSION_SERVICE    = Symbol('SESSION_SERVICE');

// prompt.di-tokens.ts
export const LLM_EXECUTOR  = Symbol('LLM_EXECUTOR');
export const SESSION_READER = Symbol('SESSION_READER');
export const SESSION_MANAGER = Symbol('SESSION_MANAGER');
```

Never use a class or abstract class as a DI token in module `providers`. Symbol tokens decouple the binding from the type hierarchy.

**Exception**: `SessionService` is exported from `SessionModule` and imported by `PromptModule` by class reference for `useClass`. The cross-module adapter (`SessionReaderAdapter`, `SessionManagerAdapter`) receives `SessionService` directly via constructor injection.

## Module Wiring Pattern

```typescript
@Module({
  imports: [SessionModule],
  controllers: [PromptHttpController],
  providers: [
    PromptService,
    { provide: LLM_EXECUTOR,   useClass: ClaudeCliAdapter },
    { provide: SESSION_READER, useClass: SessionReaderAdapter },
    { provide: SESSION_MANAGER, useClass: SessionManagerAdapter },
  ],
})
export class PromptModule {}
```

## Contract Type Names

Abstract port classes do **not** carry a "Port" suffix:

| Correct | Incorrect |
|---------|-----------|
| `SessionRepository` | `SessionRepositoryPort` |
| `LlmExecutor` | `LlmExecutorPort` |
| `SessionReader` | `SessionReaderPort` |

## Application Layer NestJS Usage

Application services may use `@Injectable()` for DI registration and `@Inject(TOKEN)` for constructor injection. All other NestJS imports in `application/` are banned.

## Platform Layer

`platform/nest/` is the only place that imports `@nestjs/core` or other platform-level packages (`APP_PIPE`, `APP_FILTER`, etc.). Bounded-context modules must not reference these.

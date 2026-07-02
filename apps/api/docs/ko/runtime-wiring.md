# 런타임 와이어링

영어 미러: [en/runtime-wiring.md](../en/runtime-wiring.md)

## DI 토큰 컨벤션

모든 바운디드 컨텍스트는 `*.di-tokens.ts` 파일에 `Symbol` 상수를 노출합니다:

```typescript
// session.di-tokens.ts
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const SESSION_SERVICE    = Symbol('SESSION_SERVICE');

// prompt.di-tokens.ts
export const LLM_EXECUTOR   = Symbol('LLM_EXECUTOR');
export const SESSION_READER  = Symbol('SESSION_READER');
export const SESSION_MANAGER = Symbol('SESSION_MANAGER');
```

모듈 `providers`에서 클래스나 abstract class를 DI 토큰으로 사용하지 않습니다. Symbol 토큰은 바인딩을 타입 계층과 분리합니다.

**예외**: `SessionService`는 `SessionModule`에서 export되고, `PromptModule`이 어댑터(`SessionReaderAdapter`, `SessionManagerAdapter`)의 생성자 주입을 위해 클래스 레퍼런스로 직접 참조합니다.

## 모듈 와이어링 패턴

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

## 포트 타입 이름

Abstract 포트 클래스에는 "Port" 접미사를 **붙이지 않습니다**:

| 올바른 | 잘못된 |
|--------|--------|
| `SessionRepository` | `SessionRepositoryPort` |
| `LlmExecutor` | `LlmExecutorPort` |
| `SessionReader` | `SessionReaderPort` |

## 애플리케이션 레이어 NestJS 사용

애플리케이션 서비스는 DI 등록을 위한 `@Injectable()`과 생성자 주입을 위한 `@Inject(TOKEN)`만 사용할 수 있습니다. 그 외 NestJS import는 `application/`에서 금지됩니다.

## 플랫폼 레이어

`platform/nest/`만 `@nestjs/core`나 플랫폼 수준 패키지(`APP_PIPE`, `APP_FILTER` 등)를 import합니다. 바운디드 컨텍스트 모듈은 이를 참조하면 안 됩니다.

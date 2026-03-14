# 헥사고날 구조 규칙

## 디렉토리 레이아웃

바운디드 컨텍스트별로 다음 구조를 따른다:

```
src/
  session/
    domain/              # 엔티티, VO, 포트
    application/         # 유스케이스 서비스
    adapter/
      in/                # 컨트롤러, DTO
      out/               # 리포지토리 구현체
    session.module.ts
  prompt/
    domain/
    application/
    adapter/
      in/
      out/
    prompt.module.ts
```

## 파일 네이밍 컨벤션

| 레이어 | 파일 접미사 | 예시 |
|--------|------------|------|
| domain | `*.entity.ts` | `session.entity.ts` |
| domain | `*.vo.ts` | `claude-options.vo.ts` |
| domain | `*.port.ts` | `session-repository.port.ts` |
| application | `*.service.ts` | `session.service.ts` |
| adapter/in | `*.controller.ts`, `*.dto.ts` | `session.controller.ts`, `create-session.dto.ts` |
| adapter/out | `*.repository.ts`, `*.adapter.ts` | `in-memory-session.repository.ts`, `claude-cli.adapter.ts` |

## 클래스 네이밍

- **포트**: `~Port` 접미사 (e.g. `SessionRepositoryPort`, `LlmPort`)
- **어댑터**: 구현 방식을 서술 (e.g. `InMemorySessionRepository`, `ClaudeCliAdapter`)
- **유스케이스 서비스**: `~Service` 접미사 (e.g. `SessionService`, `PromptService`)

## 레이어별 import 제약

### `domain/`

- NestJS 데코레이터·모듈 import 금지
- 외부 라이브러리 import 금지
- 같은 컨텍스트의 `domain/` 내부만 참조 가능

### `application/`

- `domain/`만 import 가능
- NestJS에서 `@Injectable()`만 허용 (DI 등록 용도)
- `adapter/` import 금지

### `adapter/`

- 모든 레이어 import 가능
- NestJS 데코레이터 자유롭게 사용

## NestJS 모듈 와이어링

포트(abstract class)를 어댑터(구현체)에 바인딩한다:

```typescript
@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    {
      provide: SessionRepositoryPort,
      useClass: InMemorySessionRepository,
    },
  ],
  exports: [SessionRepositoryPort],
})
export class SessionModule {}
```

## 테스트 파일 배치

기존 co-located 컨벤션을 유지하되 레이어별 경로에 맞춘다:

```
src/
  session/
    domain/
      session.entity.spec.ts
    application/
      session.service.spec.ts
    adapter/
      in/
        session.controller.spec.ts
test/
  session.e2e-spec.ts
```
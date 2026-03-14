# 헥사고날 도메인 규칙

## 바운디드 컨텍스트 정의

### Session 컨텍스트

| 구분 | 내용 |
|------|------|
| **엔티티** | `Session` — id, claudeSessionId, createdAt, lastUsedAt |
| **포트** | `SessionRepositoryPort` — create, findOne, remove |
| **서비스** | `SessionService` — 세션 생명주기 관리 |

### Prompt 컨텍스트

| 구분 | 내용 |
|------|------|
| **VO** | `ClaudeOptions` — model, maxTokens 등 실행 옵션 |
| **타입** | `PromptEvent` — SSE 스트림 이벤트 타입 |
| **포트** | `LlmPort` — LLM 실행 추상화, `SessionReaderPort` — 세션 조회 추상화 |
| **서비스** | `PromptService` — 프롬프트 실행 오케스트레이션 |

## 도메인 엔티티 규칙

- plain class로 작성, NestJS 데코레이터 사용 금지
- 비즈니스 로직은 엔티티 메서드로 캡슐화
- 생성은 정적 팩토리 메서드 또는 생성자 사용
- 외부 라이브러리 의존 금지

```typescript
// 예시: session.entity.ts
export class Session {
  constructor(
    public readonly id: string,
    public claudeSessionId: string | null,
    public readonly createdAt: Date,
    public lastUsedAt: Date,
  ) {}

  attachClaudeSession(claudeSessionId: string): void {
    this.claudeSessionId = claudeSessionId;
    this.lastUsedAt = new Date();
  }
}
```

## 포트 설계 규칙

- **abstract class**로 정의 (NestJS DI 토큰 역할)
- 메서드 시그니처에 도메인 타입만 사용 (DTO, HTTP 객체 금지)
- 포트는 `domain/` 디렉토리에 위치

```typescript
// 예시: session-repository.port.ts
export abstract class SessionRepositoryPort {
  abstract save(session: Session): Session;
  abstract findById(id: string): Session | undefined;
  abstract remove(id: string): boolean;
}
```

## 어댑터 설계 규칙

- **Driving 어댑터** (adapter/in): 컨트롤러가 application service를 호출
- **Driven 어댑터** (adapter/out): 포트를 구현하여 외부 시스템과 통신

```typescript
// 예시: in-memory-session.repository.ts
@Injectable()
export class InMemorySessionRepository extends SessionRepositoryPort {
  private readonly sessions = new Map<string, Session>();

  save(session: Session): Session {
    this.sessions.set(session.id, session);
    return session;
  }

  findById(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  remove(id: string): boolean {
    return this.sessions.delete(id);
  }
}
```

## 크로스 컨텍스트 통신

Prompt 컨텍스트가 Session 컨텍스트에 의존할 때, 직접 import 대신 `SessionReaderPort`로 격리한다:

```typescript
// prompt/domain/session-reader.port.ts
export abstract class SessionReaderPort {
  abstract findById(id: string): Session | undefined;
}
```

- Prompt 모듈은 `SessionReaderPort`만 의존
- Session 모듈이 `SessionReaderPort` 구현체를 export
- 양방향 의존은 금지

## 마이그레이션 순서

DDD 전환은 다음 순서로 진행한다:

1. **엔티티 추출** — 기존 서비스에서 도메인 엔티티·VO를 분리하여 `domain/`에 배치
2. **포트 정의** — 외부 의존성 인터페이스를 abstract class로 정의
3. **application service** — 유스케이스 로직을 포트 의존으로 재작성
4. **어댑터 구현** — 기존 구현체를 어댑터로 이동, 포트 구현
5. **모듈 와이어링** — NestJS 모듈에서 포트-어댑터 바인딩
6. **테스트 업데이트** — 포트 mock 기반으로 테스트 전환
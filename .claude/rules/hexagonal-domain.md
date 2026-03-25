# 헥사고날 도메인 규칙

## 도메인 엔티티 규칙

- plain class로 작성, NestJS 데코레이터 사용 금지
- 변경 가능 필드는 `private`으로 선언하고 getter 제공 (Aggregate Root 패턴)
- 불변 필드는 `private readonly`로 선언
- 비즈니스 로직은 엔티티 메서드로 캡슐화 — 외부에서 필드 직접 수정 금지
- 메서드에서 입력값 검증 수행 (빈 문자열, null 등)
- 생성은 정적 팩토리 메서드 또는 생성자 사용
- 외부 라이브러리 의존 금지
- JSON 직렬화가 필요하면 `toJSON()` 메서드 제공

```typescript
// 예시
export class Session {
  private _claudeSessionId: string | null;
  private _lastUsedAt: Date;

  constructor(
    private readonly _id: string,
    claudeSessionId: string | null,
    private readonly _createdAt: Date,
    lastUsedAt: Date,
  ) { ... }

  static create(id: string): Session { ... }

  get id(): string { return this._id; }
  get claudeSessionId(): string | null { return this._claudeSessionId; }

  attachClaudeSession(claudeSessionId: string): void {
    if (!claudeSessionId || claudeSessionId.trim().length === 0) {
      throw new Error('Claude session ID must not be empty');
    }
    this._claudeSessionId = claudeSessionId;
    this._lastUsedAt = new Date();
  }
}
```

## Value Object 규칙

- **불변 class**로 정의 (interface가 아닌 class)
- `private constructor` + 정적 팩토리 메서드 `create()` 패턴 사용
- 모든 필드 `readonly`
- 팩토리 메서드에서 입력값 검증 수행 (도메인 규칙 캡슐화)
- 방어적 복사로 컬렉션 불변성 보장

```typescript
// 예시
export class ClaudeOptions {
  private constructor(
    public readonly prompt: string,
    public readonly sessionId: string,
    ...
  ) {}

  static create(params: { ... }): ClaudeOptions {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt must not be empty');
    }
    return new ClaudeOptions(...);
  }
}
```

## 포트 설계 규칙

- **abstract class**로 정의 (NestJS DI 토큰 역할)
- 메서드 시그니처에 도메인 타입만 사용 (DTO, HTTP 객체 금지)
- 포트는 `domain/` 디렉토리에 위치
- 크로스 컨텍스트 포트는 용도별로 분리 (읽기 전용 / 생명주기 관리)

```typescript
// 예시
export abstract class SessionRepositoryPort {
  abstract save(session: Session): Session;
  abstract findById(id: string): Session | undefined;
  abstract remove(id: string): boolean;
}
```

## 어댑터 설계 규칙

- **Driving 어댑터** (adapter/in): 컨트롤러가 application service를 호출
- **Driven 어댑터** (adapter/out): 포트를 구현하여 외부 시스템과 통신
- 어댑터는 다른 컨텍스트의 도메인을 직접 수정하지 않는다 (관심사 분리)
- 외부 시스템 호출 어댑터(예: LLM CLI)는 순수하게 I/O 변환만 담당 — 도메인 상태 변경은 Application Service에서 처리

## 크로스 컨텍스트 통신

- 다른 컨텍스트에 의존할 때 직접 import 대신 포트로 격리
- 포트는 용도별로 분리: 읽기 전용 포트(`~ReaderPort`)와 쓰기 포트(`~ManagerPort`)
- 양방향 의존 금지
- 포트 구현체(어댑터)는 의존 대상 컨텍스트의 Application Service에 위임
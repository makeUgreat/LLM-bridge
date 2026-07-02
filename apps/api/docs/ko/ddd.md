# DDD 패턴

영어 미러: [en/ddd.md](../en/ddd.md)

## 엔티티

- 순수 클래스, NestJS 데코레이터 금지
- 변경 가능 필드: `private`, getter 제공
- 불변 필드: `private readonly`
- 비즈니스 로직은 메서드로 캡슐화 — 외부에서 필드 직접 수정 금지
- 정적 팩토리 메서드 `static create(...)` 또는 public 생성자

```typescript
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

  attachClaudeSession(claudeSessionId: string): void {
    if (!claudeSessionId || claudeSessionId.trim().length === 0) {
      throw new Error('Claude session ID must not be empty');
    }
    this._claudeSessionId = claudeSessionId;
  }
}
```

## 값 객체 (Value Object)

- 불변 클래스 (`private constructor` + `static create()`)
- 모든 필드 `readonly`
- 팩토리 메서드에서 검증 수행
- 컬렉션은 방어적 복사

```typescript
export class ClaudeOptions {
  private constructor(
    public readonly prompt: string,
    public readonly allowedTools: readonly string[],
    ...
  ) {}

  static create(params: { prompt: string; allowedTools?: string[]; ... }): ClaudeOptions {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt must not be empty');
    }
    return new ClaudeOptions(params.prompt, [...(params.allowedTools ?? [])], ...);
  }
}
```

## 포트 (abstract class)

포트는 인터페이스가 아닌 abstract class로 정의합니다. NestJS DI 토큰으로도 활용됩니다.

- "Port" 접미사 없음: `SessionRepository`, `LlmExecutor`, `SessionReader`
- 메서드 시그니처에 도메인 타입만 사용 (DTO, HTTP 객체 금지)
- `find(criteria: { id: string })` — repository 조회는 criteria 객체 패턴
- `list()` — 전체 조회 (`findAll()` 아님)

```typescript
export abstract class SessionRepository {
  abstract save(session: Session): Session;
  abstract find(criteria: { id: string }): Session | undefined;
  abstract list(): Session[];
  abstract remove(id: string): boolean;
  abstract removeExpired(ttlMs: number): number;
}
```

## 크로스 컨텍스트 통신

`prompt` 컨텍스트는 세션 데이터가 필요합니다. 자신의 `domain/`에 좁은 포트를 정의합니다:

- `SessionReader` — 읽기 전용 (`find`)
- `SessionManager` — 쓰기 (`create`, `touch`, `updateClaudeSessionId`, `remove`)

`prompt/infrastructure/session/`의 어댑터가 이 포트를 구현하여 `SessionService`에 위임합니다.

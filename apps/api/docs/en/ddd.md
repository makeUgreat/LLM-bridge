# DDD Patterns

Korean mirror: [ko/ddd.md](../ko/ddd.md)

## Entity

- Plain class, no NestJS decorators
- Mutable fields: `private`, exposed via getter
- Immutable fields: `private readonly`
- Business logic encapsulated in methods — no direct field mutation from outside
- Factory method `static create(...)` or public constructor

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

## Value Object

- Immutable class (`private constructor` + `static create()`)
- All fields `readonly`
- Validation in factory method
- Defensive copy for collections

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

## Port (abstract class)

Ports are abstract classes (not interfaces) so they can double as NestJS DI tokens.

- Named without "Port" suffix: `SessionRepository`, `LlmExecutor`, `SessionReader`
- Method signatures use only domain types (no DTOs or HTTP objects)
- `find(criteria: { id: string })` — criteria object pattern for repository lookups
- `list()` — returns all, not `findAll()`

```typescript
export abstract class SessionRepository {
  abstract save(session: Session): Session;
  abstract find(criteria: { id: string }): Session | undefined;
  abstract list(): Session[];
  abstract remove(id: string): boolean;
  abstract removeExpired(ttlMs: number): number;
}
```

## Cross-Context Communication

The `prompt` context needs session data. It defines its own narrow ports in `domain/`:

- `SessionReader` — read-only access (`find`)
- `SessionManager` — write access (`create`, `touch`, `updateClaudeSessionId`, `remove`)

Adapters in `prompt/infrastructure/session/` implement these ports by delegating to `SessionService`.

import { Entity } from '@kernels/domain/index';

interface SessionProps {
  claudeSessionId: string | null;
  lastUsedAt: Date;
}

export class Session extends Entity<SessionProps> {
  constructor(
    id: string,
    claudeSessionId: string | null,
    createdAt: Date,
    lastUsedAt: Date,
  ) {
    super({
      id,
      createdAt,
      updatedAt: lastUsedAt,
      props: {
        claudeSessionId,
        lastUsedAt,
      },
    });
  }

  static create(id: string): Session {
    const now = new Date();
    return new Session(id, null, now, now);
  }

  get claudeSessionId(): string | null {
    return this.props.claudeSessionId;
  }

  get lastUsedAt(): Date {
    return this.props.lastUsedAt;
  }

  attachClaudeSession(claudeSessionId: string): void {
    if (!claudeSessionId || claudeSessionId.trim().length === 0) {
      throw new Error('Claude session ID must not be empty');
    }
    this.props.claudeSessionId = claudeSessionId;
    this.refreshLastUsedAt();
  }

  touch(): void {
    this.refreshLastUsedAt();
  }

  isExpired(ttlMs: number, now: Date = new Date()): boolean {
    return now.getTime() - this.props.lastUsedAt.getTime() > ttlMs;
  }

  toJSON() {
    return {
      id: this.id,
      claudeSessionId: this.props.claudeSessionId,
      createdAt: this.createdAt,
      lastUsedAt: this.props.lastUsedAt,
    };
  }

  validate(): void {
    if (
      this.props.claudeSessionId !== null &&
      this.props.claudeSessionId.trim().length === 0
    ) {
      throw new Error('Claude session ID must not be empty');
    }

    if (Number.isNaN(this.props.lastUsedAt.getTime())) {
      throw new Error('Session last used at must be a valid date');
    }
  }

  private refreshLastUsedAt(): void {
    const now = new Date();
    this.props.lastUsedAt = now;
    this.touchUpdatedAt(now);
  }
}

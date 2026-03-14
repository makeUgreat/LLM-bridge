export class Session {
  private _claudeSessionId: string | null;
  private _lastUsedAt: Date;

  constructor(
    private readonly _id: string,
    claudeSessionId: string | null,
    private readonly _createdAt: Date,
    lastUsedAt: Date,
  ) {
    this._claudeSessionId = claudeSessionId;
    this._lastUsedAt = lastUsedAt;
  }

  static create(id: string): Session {
    const now = new Date();
    return new Session(id, null, now, now);
  }

  get id(): string {
    return this._id;
  }

  get claudeSessionId(): string | null {
    return this._claudeSessionId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get lastUsedAt(): Date {
    return this._lastUsedAt;
  }

  attachClaudeSession(claudeSessionId: string): void {
    if (!claudeSessionId || claudeSessionId.trim().length === 0) {
      throw new Error('Claude session ID must not be empty');
    }
    this._claudeSessionId = claudeSessionId;
    this._lastUsedAt = new Date();
  }

  touch(): void {
    this._lastUsedAt = new Date();
  }

  toJSON() {
    return {
      id: this._id,
      claudeSessionId: this._claudeSessionId,
      createdAt: this._createdAt,
      lastUsedAt: this._lastUsedAt,
    };
  }
}

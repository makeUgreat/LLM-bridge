export class ClaudeOptions {
  private constructor(
    public readonly prompt: string,
    public readonly sessionId: string,
    public readonly claudeSessionId: string | null,
    public readonly workingDir?: string,
    public readonly model?: string,
    public readonly permissionMode?: string,
    public readonly allowedTools?: readonly string[],
    public readonly systemPrompt?: string,
  ) {}

  static create(params: {
    prompt: string;
    sessionId: string;
    claudeSessionId: string | null;
    workingDir?: string;
    model?: string;
    permissionMode?: string;
    allowedTools?: string[];
    systemPrompt?: string;
  }): ClaudeOptions {
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt must not be empty');
    }
    return new ClaudeOptions(
      params.prompt,
      params.sessionId,
      params.claudeSessionId,
      params.workingDir,
      params.model,
      params.permissionMode,
      params.allowedTools ? [...params.allowedTools] : undefined,
      params.systemPrompt,
    );
  }
}

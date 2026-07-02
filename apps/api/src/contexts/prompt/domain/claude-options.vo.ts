import { ValueObject, type ValueObjectProps } from '@kernels/domain/index';

interface ClaudeOptionsProps {
  prompt: string;
  sessionId: string;
  claudeSessionId: string | null;
  workingDir?: string;
  model?: string;
  permissionMode?: string;
  allowedTools?: readonly string[];
  systemPrompt?: string;
}

export class ClaudeOptions extends ValueObject<ClaudeOptionsProps> {
  private constructor(props: ClaudeOptionsProps) {
    super(props);
  }

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
    return new ClaudeOptions({
      prompt: params.prompt,
      sessionId: params.sessionId,
      claudeSessionId: params.claudeSessionId,
      workingDir: params.workingDir,
      model: params.model,
      permissionMode: params.permissionMode,
      allowedTools: params.allowedTools ? [...params.allowedTools] : undefined,
      systemPrompt: params.systemPrompt,
    });
  }

  get prompt(): string {
    return this.props.prompt;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get claudeSessionId(): string | null {
    return this.props.claudeSessionId;
  }

  get workingDir(): string | undefined {
    return this.props.workingDir;
  }

  get model(): string | undefined {
    return this.props.model;
  }

  get permissionMode(): string | undefined {
    return this.props.permissionMode;
  }

  get allowedTools(): readonly string[] | undefined {
    return this.props.allowedTools;
  }

  get systemPrompt(): string | undefined {
    return this.props.systemPrompt;
  }

  protected validate(props: ValueObjectProps<ClaudeOptionsProps>): void {
    if (!props.prompt || props.prompt.trim().length === 0) {
      throw new Error('Prompt must not be empty');
    }
  }
}

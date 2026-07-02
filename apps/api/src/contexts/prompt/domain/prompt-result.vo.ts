import { ValueObject, type ValueObjectProps } from '@kernels/domain/index';

interface PromptResultProps {
  text: string;
  error: string | null;
  exitCode: number | null;
}

export class PromptResult extends ValueObject<PromptResultProps> {
  private constructor(props: PromptResultProps) {
    super(props);
  }

  static create(params: {
    text: string;
    error: string | null;
    exitCode: number | null;
  }): PromptResult {
    return new PromptResult(params);
  }

  get text(): string {
    return this.props.text;
  }

  get error(): string | null {
    return this.props.error;
  }

  get exitCode(): number | null {
    return this.props.exitCode;
  }

  protected validate(_props: ValueObjectProps<PromptResultProps>): void {
    return;
  }
}

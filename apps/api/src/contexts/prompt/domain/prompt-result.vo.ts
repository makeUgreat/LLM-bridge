export class PromptResult {
  private constructor(
    public readonly text: string,
    public readonly error: string | null,
    public readonly exitCode: number | null,
  ) {}

  static create(params: {
    text: string;
    error: string | null;
    exitCode: number | null;
  }): PromptResult {
    return new PromptResult(params.text, params.error, params.exitCode);
  }
}

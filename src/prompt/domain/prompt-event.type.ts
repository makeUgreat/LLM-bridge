export type PromptEvent =
  | { type: 'text'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done'; exitCode: number | null }
  | { type: string; [key: string]: unknown };

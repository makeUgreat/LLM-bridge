import { z } from 'zod';

const promptBodySchema = z.object({
  prompt: z.string().min(1, 'prompt must not be empty'),
  model: z.string().optional(),
  workingDir: z.string().optional(),
  permissionMode: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

export class PromptBodyDto {
  static readonly zodSchema = promptBodySchema;
  static readonly zodErrorCode = 'prompt.body.validation_failed';
  static readonly zodErrorMessage = 'Invalid prompt request body';

  readonly prompt!: string;
  readonly model?: string;
  readonly workingDir?: string;
  readonly permissionMode?: string;
  readonly allowedTools?: string[];
  readonly systemPrompt?: string;
}

export type PromptBodyShape = z.infer<typeof promptBodySchema>;

// Response shapes (output only)
export interface SyncPromptHttpResponse {
  readonly text: string;
  readonly error: string | null;
  readonly exitCode: number | null;
}

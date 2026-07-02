import { z } from 'zod';

// Response shapes (no validation needed — output only)
export interface CreateSessionHttpResponse {
  readonly sessionId: string;
  readonly createdAt: Date;
}

export interface DeleteSessionHttpResponse {
  readonly deleted: boolean;
}

export interface SessionHttpResponse {
  readonly id: string;
  readonly claudeSessionId: string | null;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
}

// Zod schema for potential future request bodies (placeholder)
export const sessionIdParamSchema = z.object({
  id: z.string().min(1),
});

export class SessionIdParamDto {
  static readonly zodSchema = sessionIdParamSchema;
  static readonly zodErrorCode = 'session.param.validation_failed';
  static readonly zodErrorMessage = 'Invalid session ID param';

  readonly id!: string;
}

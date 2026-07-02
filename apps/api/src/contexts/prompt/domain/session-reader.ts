import { type PromptSession } from './prompt-session';

export abstract class SessionReader {
  abstract find(criteria: { id: string }): PromptSession | undefined;
}

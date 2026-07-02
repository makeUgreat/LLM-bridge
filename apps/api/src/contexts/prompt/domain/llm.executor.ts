import { type Observable } from 'rxjs';
import { type ClaudeOptions } from './claude-options.vo';
import { type LlmEvent } from './prompt-event.type';

export abstract class LlmExecutor {
  abstract execute(options: ClaudeOptions): Observable<LlmEvent>;
}

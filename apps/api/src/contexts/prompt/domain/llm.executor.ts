import { type Observable } from 'rxjs';
import { type ClaudeOptions } from './claude-options.vo.js';
import { type LlmEvent } from './prompt-event.type.js';

export abstract class LlmExecutor {
  abstract execute(options: ClaudeOptions): Observable<LlmEvent>;
}

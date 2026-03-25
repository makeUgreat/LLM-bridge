import { Observable } from 'rxjs';
import { ClaudeOptions } from './claude-options.vo';
import { LlmEvent } from './prompt-event.type';

export abstract class LlmPort {
  abstract execute(options: ClaudeOptions): Observable<LlmEvent>;
}

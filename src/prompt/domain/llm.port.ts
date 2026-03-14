import { Observable } from 'rxjs';
import { ClaudeOptions } from './claude-options.vo';

export abstract class LlmPort {
  abstract execute(options: ClaudeOptions): Observable<MessageEvent>;
}

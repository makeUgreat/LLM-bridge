import { Session } from '../../session/domain/session.entity';

export abstract class SessionReaderPort {
  abstract findById(id: string): Session | undefined;
}

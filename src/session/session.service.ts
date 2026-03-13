import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

export interface Session {
  id: string;
  claudeSessionId: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, Session>();

  create(): Session {
    const session: Session = {
      id: uuidv4(),
      claudeSessionId: null,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  findOne(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  findAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  updateClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.claudeSessionId = claudeSessionId;
      session.lastUsedAt = new Date();
    }
  }

  remove(id: string): boolean {
    return this.sessions.delete(id);
  }
}
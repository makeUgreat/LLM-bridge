import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SessionService } from '@contexts/session/application/session.service';

@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionCleanupService.name);
  private intervalRef!: ReturnType<typeof setInterval>;
  private readonly ttlMs: number;
  private readonly intervalMs: number;

  constructor(private readonly sessionService: SessionService) {
    this.ttlMs = parseInt(process.env.SESSION_TTL_MS ?? '1800000', 10);
    this.intervalMs = parseInt(
      process.env.SESSION_CLEANUP_INTERVAL_MS ?? '60000',
      10,
    );
  }

  onModuleInit(): void {
    this.intervalRef = setInterval(() => this.cleanup(), this.intervalMs);
  }

  onModuleDestroy(): void {
    clearInterval(this.intervalRef);
  }

  private cleanup(): void {
    const removed = this.sessionService.removeExpired(this.ttlMs);
    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired session(s)`);
    }
  }
}

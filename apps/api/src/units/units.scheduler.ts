import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UnitsService } from './units.service';

@Injectable()
export class UnitsScheduler {
  private readonly logger = new Logger(UnitsScheduler.name);

  constructor(private readonly units: UnitsService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'release-busy-units' })
  async releaseExpiredUnits(): Promise<void> {
    try {
      await this.units.releaseExpired();
    } catch (error) {
      this.logger.error(
        'Releasing busy units failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

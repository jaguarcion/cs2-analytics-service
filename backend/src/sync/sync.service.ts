import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectQueue('csfloat-stall') private readonly csfloatStallQueue: Queue,
    @InjectQueue('csfloat-trades') private readonly csfloatTradesQueue: Queue,
    @InjectQueue('market-trades') private readonly marketTradesQueue: Queue,
    @InjectQueue('market-rate') private readonly marketRateQueue: Queue,
  ) {}

  // CSFloat stall — every hour at :00
  @Cron(CronExpression.EVERY_HOUR)
  async syncCsfloatStall() {
    this.logger.log('Scheduling CSFloat stall sync...');
    await this.csfloatStallQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // CSFloat trades — every hour at :05
  @Cron('5 * * * *')
  async syncCsfloatTrades() {
    this.logger.log('Scheduling CSFloat trades sync...');
    await this.csfloatTradesQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // Market.CSGO trades — every hour at :10
  @Cron('10 * * * *')
  async syncMarketTrades() {
    this.logger.log('Scheduling Market.CSGO trades sync...');
    await this.marketTradesQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // Market.CSGO withdraw rate — every hour at :15
  @Cron('15 * * * *')
  async syncMarketRate() {
    this.logger.log('Scheduling Market.CSGO rate sync...');
    await this.marketRateQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }
}

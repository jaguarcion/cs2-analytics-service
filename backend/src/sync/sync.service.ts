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

  // CSFloat stall — every 3 minutes
  @Cron('*/3 * * * *')
  async syncCsfloatStall() {
    this.logger.log('Scheduling CSFloat stall sync...');
    await this.csfloatStallQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // CSFloat trades — every 2 minutes
  @Cron('*/2 * * * *')
  async syncCsfloatTrades() {
    this.logger.log('Scheduling CSFloat trades sync...');
    await this.csfloatTradesQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // Market.CSGO trades — every 2 minutes
  @Cron('*/2 * * * *')
  async syncMarketTrades() {
    this.logger.log('Scheduling Market.CSGO trades sync...');
    await this.marketTradesQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }

  // Market.CSGO withdraw rate — every 15 minutes
  @Cron('*/15 * * * *')
  async syncMarketRate() {
    this.logger.log('Scheduling Market.CSGO rate sync...');
    await this.marketRateQueue.add('sync', {}, { removeOnComplete: 10, removeOnFail: 5 });
  }
}

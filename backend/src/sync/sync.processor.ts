import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CsfloatService } from '../collectors/csfloat/csfloat.service';
import { MarketCsgoService } from '../collectors/market-csgo/market-csgo.service';

@Processor('csfloat-stall')
export class CsfloatStallProcessor extends WorkerHost {
  private readonly logger = new Logger(CsfloatStallProcessor.name);

  constructor(private readonly csfloatService: CsfloatService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing CSFloat stall sync job ${job.id}`);
    try {
      await this.csfloatService.syncStall();
    } catch (error) {
      this.logger.error(`CSFloat stall sync failed: ${error.message}`);
      throw error;
    }
  }
}

@Processor('csfloat-trades')
export class CsfloatTradesProcessor extends WorkerHost {
  private readonly logger = new Logger(CsfloatTradesProcessor.name);

  constructor(private readonly csfloatService: CsfloatService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing CSFloat trades sync job ${job.id}`);
    try {
      await this.csfloatService.syncTrades();
    } catch (error) {
      this.logger.error(`CSFloat trades sync failed: ${error.message}`);
      throw error;
    }
  }
}

@Processor('market-trades')
export class MarketTradesProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketTradesProcessor.name);

  constructor(private readonly marketCsgoService: MarketCsgoService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing Market.CSGO trades sync job ${job.id}`);
    try {
      await this.marketCsgoService.syncTrades();
      // After sync, try to fetch missing floats
      await this.marketCsgoService.updateMissingFloats();
    } catch (error) {
      this.logger.error(`Market.CSGO trades sync failed: ${error.message}`);
      throw error;
    }
  }
}

@Processor('market-rate')
export class MarketRateProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketRateProcessor.name);

  constructor(private readonly marketCsgoService: MarketCsgoService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing Market.CSGO rate sync job ${job.id}`);
    try {
      await this.marketCsgoService.syncWithdrawRate();
    } catch (error) {
      this.logger.error(`Market.CSGO rate sync failed: ${error.message}`);
      throw error;
    }
  }
}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CsfloatModule } from '../collectors/csfloat/csfloat.module';
import { MarketCsgoModule } from '../collectors/market-csgo/market-csgo.module';
import { SyncService } from './sync.service';
import {
  CsfloatStallProcessor,
  CsfloatTradesProcessor,
  MarketTradesProcessor,
  MarketRateProcessor,
} from './sync.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'csfloat-stall' },
      { name: 'csfloat-trades' },
      { name: 'market-trades' },
      { name: 'market-rate' },
    ),
    CsfloatModule,
    MarketCsgoModule,
  ],
  providers: [
    SyncService,
    CsfloatStallProcessor,
    CsfloatTradesProcessor,
    MarketTradesProcessor,
    MarketRateProcessor,
  ],
  exports: [SyncService],
})
export class SyncModule {}

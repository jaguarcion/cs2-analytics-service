import { Module } from '@nestjs/common';
import { MatcherModule } from '../matcher/matcher.module';
import { CsfloatModule } from '../collectors/csfloat/csfloat.module';
import { MarketCsgoModule } from '../collectors/market-csgo/market-csgo.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [MatcherModule, CsfloatModule, MarketCsgoModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

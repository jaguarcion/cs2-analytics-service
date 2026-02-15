import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MatcherModule } from '../matcher/matcher.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [MatcherModule, HttpModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

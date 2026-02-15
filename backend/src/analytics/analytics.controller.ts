import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(
    @Query('period') period: string = 'month',
    @Query('platform') platform: string = 'ALL',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let dates: { from: Date; to: Date };

    if (from && to) {
      dates = { from: new Date(from), to: new Date(to) };
    } else {
      dates = this.analyticsService.getPeriodDates(period);
    }

    return this.analyticsService.getSummary({
      ...dates,
      platform: platform as any,
    });
  }

  @Get('purchases')
  async getPurchases(
    @Query('period') period: string = 'month',
    @Query('platform') platform: string = 'ALL',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let dates: { from: Date; to: Date };

    if (from && to) {
      dates = { from: new Date(from), to: new Date(to) };
    } else {
      dates = this.analyticsService.getPeriodDates(period);
    }

    return this.analyticsService.getPurchases({
      ...dates,
      platform: platform as any,
    });
  }

  @Get('sales')
  async getSales(
    @Query('period') period: string = 'month',
    @Query('platform') platform: string = 'ALL',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let dates: { from: Date; to: Date };

    if (from && to) {
      dates = { from: new Date(from), to: new Date(to) };
    } else {
      dates = this.analyticsService.getPeriodDates(period);
    }

    return this.analyticsService.getSales({
      ...dates,
      platform: platform as any,
    });
  }

  @Get('profit')
  async getProfit(
    @Query('period') period: string = 'month',
    @Query('platform') platform: string = 'ALL',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    let dates: { from: Date; to: Date };

    if (from && to) {
      dates = { from: new Date(from), to: new Date(to) };
    } else {
      dates = this.analyticsService.getPeriodDates(period);
    }

    return this.analyticsService.getMatchedProfitTable({
      ...dates,
      platform: platform as any,
    });
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.analyticsService.getSyncStatus();
  }
}

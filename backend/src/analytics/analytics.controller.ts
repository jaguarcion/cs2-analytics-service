import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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
    @Query('hidden') hidden: string = 'false',
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
      hidden: hidden === 'true',
    });
  }

  @Get('sales')
  async getSales(
    @Query('period') period: string = 'month',
    @Query('platform') platform: string = 'ALL',
    @Query('hidden') hidden: string = 'false',
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
      hidden: hidden === 'true',
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

  @Get('dashboard-stats')
  async getDashboardStats(
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

    return this.analyticsService.getDashboardStats({
      ...dates,
      platform: platform as any,
    });
  }

  @Get('inventory')
  async getInventory(
    @Query('platform') platform: string = 'ALL',
  ) {
    return this.analyticsService.getInventory(platform as any);
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.analyticsService.getSyncStatus();
  }

  @Post('sync/all')
  async syncAll() {
    const results = {
      csfloatStall: 0,
      csfloatTrades: 0,
      marketTrades: 0,
      marketRate: 0,
    };

    const baseUrl =
      this.configService.get<string>('INTERNAL_API_URL') || 'http://localhost:4001/api';

    try {
      const csfloatStallRes = await lastValueFrom(
        this.httpService.post(`${baseUrl}/csfloat/sync/stall`)
      );
      results.csfloatStall = parseInt(csfloatStallRes.data?.message?.match(/\d+/)?.[0]) || 0;
    } catch (e) {
      console.warn('CSFloat stall sync failed:', e.message);
    }

    try {
      const csfloatTradesRes = await lastValueFrom(
        this.httpService.post(`${baseUrl}/csfloat/sync/trades`)
      );
      results.csfloatTrades = parseInt(csfloatTradesRes.data?.message?.match(/\d+/)?.[0]) || 0;
    } catch (e) {
      console.warn('CSFloat trades sync failed:', e.message);
    }

    try {
      const marketTradesRes = await lastValueFrom(
        this.httpService.post(`${baseUrl}/market-csgo/sync/trades`)
      );
      results.marketTrades = parseInt(marketTradesRes.data?.message?.match(/\d+/)?.[0]) || 0;
    } catch (e) {
      console.warn('Market.CSGO trades sync failed:', e.message);
    }

    try {
      const marketRateRes = await lastValueFrom(
        this.httpService.post(`${baseUrl}/market-csgo/sync/rate`)
      );
      results.marketRate = marketRateRes.data?.rate || 0;
    } catch (e) {
      console.warn('Market.CSGO rate sync failed:', e.message);
    }

    return {
      message: 'Full sync completed',
      results,
    };
  }

  @Post('trades/:id/toggle-hide')
  async toggleHide(@Param('id') id: string) {
    const trade = await this.prisma.trade.findUnique({ where: { id } });
    if (!trade) {
      return { error: 'Trade not found' };
    }
    const updated = await this.prisma.trade.update({
      where: { id },
      data: { hidden: !trade.hidden },
    });
    return { id: updated.id, hidden: updated.hidden };
  }

  @Post('trades/bulk-hide')
  async bulkHide(@Body() body: { ids: string[]; hidden: boolean }) {
    const { ids, hidden } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { error: 'No trade IDs provided' };
    }
    const result = await this.prisma.trade.updateMany({
      where: { id: { in: ids } },
      data: { hidden },
    });
    return { updated: result.count, hidden };
  }
}

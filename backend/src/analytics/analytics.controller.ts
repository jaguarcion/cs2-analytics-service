import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CsfloatService } from '../collectors/csfloat/csfloat.service';
import { MarketCsgoService } from '../collectors/market-csgo/market-csgo.service';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly csfloatService: CsfloatService,
    private readonly marketCsgoService: MarketCsgoService,
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

  @Get('third-party')
  async getThirdPartyItems() {
    return this.analyticsService.getThirdPartyItems();
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

    try {
      results.csfloatStall = await this.csfloatService.syncStall();
    } catch (e) {
      console.warn('CSFloat stall sync failed:', e.message);
    }

    try {
      results.csfloatTrades = await this.csfloatService.syncTrades();
    } catch (e) {
      console.warn('CSFloat trades sync failed:', e.message);
    }

    try {
      results.marketTrades = await this.marketCsgoService.syncTrades();
    } catch (e) {
      console.warn('Market.CSGO trades sync failed:', e.message);
    }

    try {
      results.marketRate = await this.marketCsgoService.syncWithdrawRate();
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

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatcherService } from '../matcher/matcher.service';
import * as dayjs from 'dayjs';

export interface AnalyticsSummary {
  inventoryValue: number;
  inventoryCount: number;
  totalPurchases: number;
  purchasesCount: number;
  totalSales: number;
  salesCount: number;
  totalProfit: number;
  profitPercent: number;
  fxRate: { pair: string; rate: number; fetchedAt: Date } | null;
}

export interface PeriodFilter {
  from: Date;
  to: Date;
  platform?: 'CSFLOAT' | 'MARKET_CSGO' | 'ALL';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: MatcherService,
  ) {}

  getPeriodDates(period: string): { from: Date; to: Date } {
    const to = dayjs().endOf('day').toDate();
    let from: Date;

    switch (period) {
      case 'week':
        from = dayjs().subtract(7, 'day').startOf('day').toDate();
        break;
      case 'month':
        from = dayjs().subtract(1, 'month').startOf('day').toDate();
        break;
      case '3months':
        from = dayjs().subtract(3, 'month').startOf('day').toDate();
        break;
      default:
        from = dayjs().subtract(1, 'month').startOf('day').toDate();
        break;
    }

    return { from, to };
  }

  async getSummary(filter: PeriodFilter): Promise<AnalyticsSummary> {
    const platformFilter =
      filter.platform && filter.platform !== 'ALL'
        ? { platformSource: filter.platform }
        : {};

    // Latest FX rate (fetch first — needed for RUB→USD conversion)
    const fxRate = await this.prisma.fxRate.findFirst({
      where: { pair: 'USDT_RUB' },
      orderBy: { fetchedAt: 'desc' },
    });
    const rubToUsd = fxRate && fxRate.rate > 0 ? 1 / fxRate.rate : 0;

    // Helper: convert price to USD based on platform
    const toUsd = (price: number, platform: string) =>
      platform === 'MARKET_CSGO' ? price * rubToUsd : price;

    // Inventory Value — deduplicated
    const inventory = await this.matcher.getDeduplicatedInventory();
    const filteredInventory =
      filter.platform && filter.platform !== 'ALL'
        ? inventory.filter((i) => i.platformSource === filter.platform)
        : inventory;

    const inventoryValue = filteredInventory.reduce((sum, item) => {
      const price = item.listings?.[0]?.price || 0;
      return sum + toUsd(price, item.platformSource);
    }, 0);

    // Purchases (BUY trades)
    const purchases = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
    });
    const totalPurchases = purchases.reduce(
      (sum, t) => sum + toUsd(t.buyPrice || 0, t.platformSource),
      0,
    );

    // Sales (SELL trades)
    const sales = await this.prisma.trade.findMany({
      where: {
        type: 'SELL',
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
    });
    const totalSales = sales.reduce(
      (sum, t) => sum + toUsd(t.sellPrice || 0, t.platformSource),
      0,
    );

    // Profit from matched trades
    const matchedTrades = await this.matcher.getMatchedTrades();
    const filteredMatched = matchedTrades.filter((t) => {
      const tradeDate = t.sellDate || t.buyDate;
      if (!tradeDate) return true;
      return tradeDate >= filter.from && tradeDate <= filter.to;
    });

    const totalProfit = filteredMatched.reduce((sum, t) => sum + t.profit, 0);
    const totalBuyForProfit = filteredMatched.reduce((sum, t) => sum + t.buyPrice, 0);
    const profitPercent = totalBuyForProfit > 0 ? (totalProfit / totalBuyForProfit) * 100 : 0;

    return {
      inventoryValue: parseFloat(inventoryValue.toFixed(2)),
      inventoryCount: filteredInventory.length,
      totalPurchases: parseFloat(totalPurchases.toFixed(2)),
      purchasesCount: purchases.length,
      totalSales: parseFloat(totalSales.toFixed(2)),
      salesCount: sales.length,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      profitPercent: parseFloat(profitPercent.toFixed(2)),
      fxRate: fxRate ? { pair: fxRate.pair, rate: fxRate.rate, fetchedAt: fxRate.fetchedAt } : null,
    };
  }

  async getPurchases(filter: PeriodFilter & { hidden?: boolean }) {
    const platformFilter =
      filter.platform && filter.platform !== 'ALL'
        ? { platformSource: filter.platform as any }
        : {};

    return this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: filter.hidden ?? false,
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
      include: { item: true },
      orderBy: { tradedAt: 'desc' },
    });
  }

  async getSales(filter: PeriodFilter & { hidden?: boolean }) {
    const platformFilter =
      filter.platform && filter.platform !== 'ALL'
        ? { platformSource: filter.platform as any }
        : {};

    return this.prisma.trade.findMany({
      where: {
        type: 'SELL',
        hidden: filter.hidden ?? false,
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
      include: { item: true },
      orderBy: { tradedAt: 'desc' },
    });
  }

  async getMatchedProfitTable(filter: PeriodFilter) {
    const matched = await this.matcher.getMatchedTrades();
    return matched.filter((t) => {
      const tradeDate = t.sellDate || t.buyDate;
      if (!tradeDate) return true;
      return tradeDate >= filter.from && tradeDate <= filter.to;
    });
  }

  async getSyncStatus() {
    const logs = await this.prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return logs;
  }
}

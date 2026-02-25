import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatcherService } from '../matcher/matcher.service';
import * as dayjs from 'dayjs';
import * as isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

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
  platform?: 'CSFLOAT' | 'MARKET_CSGO' | 'MANUAL' | 'ALL';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: MatcherService,
  ) { }

  getPeriodDates(period: string): { from: Date; to: Date } {
    const to = dayjs().endOf('day').toDate();
    let from: Date;

    switch (period) {
      case 'week':
        // С начала текущей недели (понедельник)
        from = dayjs().startOf('isoWeek').toDate();
        break;
      case 'month':
        // С начала текущего месяца
        from = dayjs().startOf('month').toDate();
        break;
      default:
        from = dayjs().startOf('month').toDate();
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

    // Inventory Value — ALL owned items (unsold BUY trades), including those in trade ban
    const matchedBuyIds = await this.matcher.getMatchedBuyIds();
    const allOwnedItems = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: false,
        status: { in: ['COMPLETED', 'TRADE_HOLD'] },
        ...platformFilter,
      },
    });
    // Exclude matched (already sold) items
    const unsoldItems = allOwnedItems.filter((t) => !matchedBuyIds.has(t.id));
    let inventoryValue = unsoldItems.reduce((sum, t) => {
      return sum + toUsd(t.buyPrice || 0, t.platformSource);
    }, 0);
    let inventoryCount = unsoldItems.length;

    // Purchases (BUY trades)
    const purchases = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: false,
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
    });
    const totalPurchases = purchases.reduce(
      (sum, t) => sum + toUsd(t.buyPrice || 0, t.platformSource),
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

    // Sales (from matched trades only, per user request)
    const totalSales = filteredMatched.reduce((sum, t) => sum + t.sellPrice, 0);
    const salesCount = filteredMatched.length;

    return {
      inventoryValue: parseFloat(inventoryValue.toFixed(2)),
      inventoryCount: inventoryCount,
      totalPurchases: parseFloat(totalPurchases.toFixed(2)),
      purchasesCount: purchases.length,
      totalSales: parseFloat(totalSales.toFixed(2)),
      salesCount: salesCount,
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

  async getDashboardStats(filter: PeriodFilter) {
    const platformFilter =
      filter.platform && filter.platform !== 'ALL'
        ? { platformSource: filter.platform as any }
        : {};

    // FX rate
    const fxRate = await this.prisma.fxRate.findFirst({
      where: { pair: 'USDT_RUB' },
      orderBy: { fetchedAt: 'desc' },
    });
    const rubToUsd = fxRate && fxRate.rate > 0 ? 1 / fxRate.rate : 0;
    const toUsd = (price: number, platform: string) =>
      platform === 'MARKET_CSGO' ? price * rubToUsd : price;

    // Items available for sale (PENDING sells = on sale)
    const onSale = await this.prisma.trade.count({
      where: { type: 'SELL', status: 'PENDING', hidden: false, ...platformFilter },
    });

    // Purchases in period
    const purchases = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: false,
        tradedAt: { gte: filter.from, lte: filter.to },
        ...platformFilter,
      },
    });
    const purchasesTotal = purchases.reduce(
      (sum, t) => sum + toUsd(t.buyPrice || 0, t.platformSource),
      0,
    );

    // Filter matched trades for the period
    const matchedTrades = await this.matcher.getMatchedTrades();
    const filteredMatched = matchedTrades.filter((t) => {
      const d = t.sellDate || t.buyDate;
      if (!d) return true;
      return d >= filter.from && d <= filter.to;
    });

    const totalBuy = filteredMatched.reduce((s, t) => s + t.buyPrice, 0);
    const totalProfit = filteredMatched.reduce((s, t) => s + t.profit, 0);
    const avgProfitPercent = totalBuy > 0 ? (totalProfit / totalBuy) * 100 : 0;

    // Sales from Matched Trades (per user request)
    const salesTotal = filteredMatched.reduce((s, t) => s + t.sellPrice, 0);
    const salesCount = filteredMatched.length;

    // Daily chart data
    const dayMs = 24 * 60 * 60 * 1000;
    const fromTime = filter.from.getTime();
    const toTime = filter.to.getTime();
    const days: { date: string; purchases: number; sales: number }[] = [];

    for (let t = fromTime; t <= toTime; t += dayMs) {
      const dayStart = new Date(t);
      const dayEnd = new Date(t + dayMs - 1);
      const dateStr = dayStart.toISOString().slice(0, 10);

      const dayPurchases = purchases
        .filter((p) => p.tradedAt && p.tradedAt >= dayStart && p.tradedAt <= dayEnd)
        .reduce((s, p) => s + toUsd(p.buyPrice || 0, p.platformSource), 0);

      // Daily sales from matched trades
      const daySales = filteredMatched
        .filter((m) => {
          // Use sellDate for sales chart, fallback to buyDate if missing (though sellDate should exist for a sale)
          const d = m.sellDate || m.buyDate;
          return d && d >= dayStart && d <= dayEnd;
        })
        .reduce((s, t) => s + t.sellPrice, 0);

      days.push({
        date: dateStr,
        purchases: parseFloat(dayPurchases.toFixed(2)),
        sales: parseFloat(daySales.toFixed(2)),
      });
    }

    return {
      onSaleCount: onSale,
      purchasesCount: purchases.length,
      purchasesTotal: parseFloat(purchasesTotal.toFixed(2)),
      salesCount: salesCount,
      salesTotal: parseFloat(salesTotal.toFixed(2)),
      avgProfitPercent: parseFloat(avgProfitPercent.toFixed(2)),
      matchedCount: filteredMatched.length,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      fxRate: fxRate ? fxRate.rate : null,
      chart: days,
    };
  }

  async getInventory(platform?: 'CSFLOAT' | 'MARKET_CSGO' | 'MANUAL' | 'ALL') {
    const now = Date.now();

    // Get all unmatched buy IDs
    const matchedBuyIds = await this.matcher.getMatchedBuyIds();

    // Get all BUY trades that are completed or in trade hold
    const platformFilter =
      platform && platform !== 'ALL'
        ? { platformSource: platform as any }
        : {};

    const buyTrades = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: false,
        status: { in: ['COMPLETED', 'TRADE_HOLD'] },
        ...platformFilter,
      },
      include: { item: true },
      orderBy: { tradedAt: 'desc' },
    });

    // Filter: not matched, not in active trade ban
    return buyTrades.filter((t) => {
      // Skip matched trades (already sold)
      if (matchedBuyIds.has(t.id)) return false;

      // TRADE_HOLD status = always in ban → goes to "Трейд-бан" tab
      if (t.status === 'TRADE_HOLD') {
        // Exception: if tradeUnlockAt exists and has expired, consider tradable
        if (t.tradeUnlockAt && t.tradeUnlockAt.getTime() <= now) return true;
        return false;
      }

      // COMPLETED: check if tradeUnlockAt is still active
      if (t.tradeUnlockAt && t.tradeUnlockAt.getTime() > now) return false;

      return true;
    });
  }

  async getThirdPartyItems() {
    const now = Date.now();

    // Get matched buy IDs to exclude already-sold items
    const matchedBuyIds = await this.matcher.getMatchedBuyIds();

    // Get ALL BUY trades with trade hold status (any platform)
    const buyTrades = await this.prisma.trade.findMany({
      where: {
        type: 'BUY',
        hidden: false,
        status: { in: ['COMPLETED', 'TRADE_HOLD'] },
      },
      include: { item: true },
      orderBy: { tradedAt: 'desc' },
    });

    // Filter: unsold items with active trade ban
    return buyTrades.filter((t) => {
      // Skip matched trades (already sold)
      if (matchedBuyIds.has(t.id)) return false;

      // Manual COMPLETED items are considered instantly tradable → not banned
      if (t.platformSource === 'MANUAL' && t.status === 'COMPLETED') return false;

      // TRADE_HOLD status without tradeUnlockAt → show as banned (no date data)
      if (t.status === 'TRADE_HOLD' && !t.tradeUnlockAt) return true;

      // Active trade ban via tradeUnlockAt
      if (t.tradeUnlockAt) {
        return t.tradeUnlockAt.getTime() > now;
      }

      // No ban data → not banned (will appear in Inventory)
      return false;
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

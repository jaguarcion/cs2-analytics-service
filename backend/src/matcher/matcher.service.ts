import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizerService } from '../normalizer/normalizer.service';

@Injectable()
export class MatcherService {
  private readonly logger = new Logger(MatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: NormalizerService,
  ) {}

  /**
   * Deduplicate items across platforms.
   * Priority: 1) asset_id match  2) name + float_value match
   */
  async getDeduplicatedInventory() {
    const allItems = await this.prisma.item.findMany({
      include: {
        listings: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const normalized = allItems.map((item) => ({
      ...item,
      normalized: this.normalizer.normalizeItem(item),
    }));

    const seen = new Map<string, typeof normalized[0]>();
    const result: typeof normalized = [];

    for (const item of normalized) {
      // Dedup by asset_id
      if (item.assetId) {
        const key = `asset:${item.assetId}`;
        if (seen.has(key)) {
          this.logger.debug(`Dedup by asset_id: ${item.name} (${item.assetId})`);
          continue;
        }
        seen.set(key, item);
      }

      // Dedup by name + float
      if (item.floatValue !== null) {
        const nameKey = `nf:${item.normalized.normalizedName}:${item.floatValue}`;
        if (seen.has(nameKey)) {
          this.logger.debug(`Dedup by name+float: ${item.name} (${item.floatValue})`);
          continue;
        }
        seen.set(nameKey, item);
      }

      result.push(item);
    }

    this.logger.log(`Dedup: ${allItems.length} -> ${result.length} items`);
    return result;
  }

  /**
   * Convert price to USD.
   * CSFloat prices are already in USD.
   * Market.CSGO prices are in RUB kopecks (divide by 100 for RUB, then convert).
   */
  private async getRubToUsd(): Promise<number> {
    const fxRate = await this.prisma.fxRate.findFirst({
      where: { pair: 'USDT_RUB' },
      orderBy: { fetchedAt: 'desc' },
    });
    return fxRate && fxRate.rate > 0 ? 1 / fxRate.rate : 0;
  }

  private toUsd(price: number, platform: string, rubToUsd: number): number {
    if (platform === 'MARKET_CSGO') {
      // Market.CSGO prices stored in RUB → multiply by rubToUsd
      return price * rubToUsd;
    }
    return price; // CSFloat already in USD
  }

  /**
   * Match buy and sell trades for the same item to calculate profit.
   * Supports cross-platform: CSFloat BUY + Market.CSGO SELL.
   *
   * Matching priority:
   *   1) asset_id (exact Steam asset match)
   *   2) name + float_value (same skin, same float)
   *   3) normalized name only (buy date < sell date, closest dates first)
   *
   * Each buy is matched to at most one sell (1:1).
   */
  async getMatchedTrades() {
    const buyTrades = await this.prisma.trade.findMany({
      where: { type: 'BUY', hidden: false },
      include: { item: true },
      orderBy: { tradedAt: 'asc' },
    });

    const sellTrades = await this.prisma.trade.findMany({
      where: { type: 'SELL', hidden: false, status: { in: ['COMPLETED', 'TRADE_HOLD', 'ACCEPTED'] } },
      include: { item: true },
      orderBy: { tradedAt: 'asc' },
    });

    const rubToUsd = await this.getRubToUsd();

    const matched: Array<{
      itemName: string;
      imageUrl: string | null;
      buyPrice: number;
      sellPrice: number;
      commission: number;
      netSell: number;
      profit: number;
      profitPercent: number;
      buyPlatform: string;
      sellPlatform: string;
      buyDate: Date | null;
      sellDate: Date | null;
    }> = [];

    // Track which buys/sells are already matched
    const usedBuyIds = new Set<string>();
    const usedSellIds = new Set<string>();

    // Normalize all items once
    const buyNorms = buyTrades.map((b) => ({
      trade: b,
      norm: this.normalizer.normalizeItem(b.item),
    }));
    const sellNorms = sellTrades.map((s) => ({
      trade: s,
      norm: this.normalizer.normalizeItem(s.item),
    }));

    // --- Pass 1: Match by asset_id ---
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;
      if (!sell.trade.item.assetId) continue;

      const buyMatch = buyNorms.find(
        (b) =>
          !usedBuyIds.has(b.trade.id) &&
          b.trade.item.assetId &&
          b.trade.item.assetId === sell.trade.item.assetId,
      );
      if (buyMatch) {
        usedBuyIds.add(buyMatch.trade.id);
        usedSellIds.add(sell.trade.id);
        this.pushMatch(matched, buyMatch.trade, sell.trade, rubToUsd);
      }
    }

    // --- Pass 2: Match by name + float ---
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;
      if (sell.norm.floatValue === null) continue;

      const buyMatch = buyNorms.find((b) => {
        if (usedBuyIds.has(b.trade.id)) return false;
        if (b.norm.floatValue === null) return false;
        return (
          b.norm.normalizedName === sell.norm.normalizedName &&
          Math.abs(b.norm.floatValue - sell.norm.floatValue!) < 0.0000001
        );
      });
      if (buyMatch) {
        usedBuyIds.add(buyMatch.trade.id);
        usedSellIds.add(sell.trade.id);
        this.pushMatch(matched, buyMatch.trade, sell.trade, rubToUsd);
      }
    }

    // --- Pass 3: Match by normalized name only (buy date < sell date) ---
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;

      // Find the earliest unmatched buy with the same name, bought before the sell
      const buyMatch = buyNorms.find((b) => {
        if (usedBuyIds.has(b.trade.id)) return false;
        if (b.norm.normalizedName !== sell.norm.normalizedName) return false;
        // Buy must be before sell (or dates unknown)
        if (b.trade.tradedAt && sell.trade.tradedAt) {
          return b.trade.tradedAt <= sell.trade.tradedAt;
        }
        return true;
      });
      if (buyMatch) {
        usedBuyIds.add(buyMatch.trade.id);
        usedSellIds.add(sell.trade.id);
        this.pushMatch(matched, buyMatch.trade, sell.trade, rubToUsd);
      }
    }

    this.logger.log(`Matched ${matched.length} trades (${buyTrades.length} buys, ${sellTrades.length} sells)`);
    return matched;
  }

  /**
   * Returns the set of BUY trade IDs that have been matched to a SELL trade.
   * Used to determine inventory (unmatched buys = idle items).
   */
  async getMatchedBuyIds(): Promise<Set<string>> {
    const buyTrades = await this.prisma.trade.findMany({
      where: { type: 'BUY', hidden: false },
      include: { item: true },
      orderBy: { tradedAt: 'asc' },
    });

    const sellTrades = await this.prisma.trade.findMany({
      where: { type: 'SELL', hidden: false, status: { in: ['COMPLETED', 'TRADE_HOLD', 'ACCEPTED'] } },
      include: { item: true },
      orderBy: { tradedAt: 'asc' },
    });

    const usedBuyIds = new Set<string>();
    const usedSellIds = new Set<string>();

    const buyNorms = buyTrades.map((b) => ({
      trade: b,
      norm: this.normalizer.normalizeItem(b.item),
    }));
    const sellNorms = sellTrades.map((s) => ({
      trade: s,
      norm: this.normalizer.normalizeItem(s.item),
    }));

    // Pass 1: asset_id
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;
      if (!sell.trade.item.assetId) continue;
      const buyMatch = buyNorms.find(
        (b) => !usedBuyIds.has(b.trade.id) && b.trade.item.assetId && b.trade.item.assetId === sell.trade.item.assetId,
      );
      if (buyMatch) { usedBuyIds.add(buyMatch.trade.id); usedSellIds.add(sell.trade.id); }
    }

    // Pass 2: name + float
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;
      if (sell.norm.floatValue === null) continue;
      const buyMatch = buyNorms.find((b) => {
        if (usedBuyIds.has(b.trade.id)) return false;
        if (b.norm.floatValue === null) return false;
        return b.norm.normalizedName === sell.norm.normalizedName && Math.abs(b.norm.floatValue - sell.norm.floatValue!) < 0.0000001;
      });
      if (buyMatch) { usedBuyIds.add(buyMatch.trade.id); usedSellIds.add(sell.trade.id); }
    }

    // Pass 3: name only (buy < sell)
    for (const sell of sellNorms) {
      if (usedSellIds.has(sell.trade.id)) continue;
      const buyMatch = buyNorms.find((b) => {
        if (usedBuyIds.has(b.trade.id)) return false;
        if (b.norm.normalizedName !== sell.norm.normalizedName) return false;
        if (b.trade.tradedAt && sell.trade.tradedAt) return b.trade.tradedAt <= sell.trade.tradedAt;
        return true;
      });
      if (buyMatch) { usedBuyIds.add(buyMatch.trade.id); usedSellIds.add(sell.trade.id); }
    }

    return usedBuyIds;
  }

  private pushMatch(
    matched: any[],
    buy: any,
    sell: any,
    rubToUsd: number,
  ) {
    if (!buy.buyPrice || !sell.sellPrice) return;

    const buyPriceUsd = this.toUsd(buy.buyPrice, buy.platformSource, rubToUsd);
    const sellPriceUsd = this.toUsd(sell.sellPrice, sell.platformSource, rubToUsd);
    const commission = sell.commission || 0.02;
    const netSell = sellPriceUsd * (1 - commission);
    const profit = netSell - buyPriceUsd;
    const profitPercent = buyPriceUsd > 0 ? (profit / buyPriceUsd) * 100 : 0;

    matched.push({
      itemName: sell.item.name,
      imageUrl: sell.item.imageUrl || buy.item.imageUrl || null,
      buyPrice: parseFloat(buyPriceUsd.toFixed(2)),
      sellPrice: parseFloat(sellPriceUsd.toFixed(2)),
      commission,
      netSell: parseFloat(netSell.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitPercent: parseFloat(profitPercent.toFixed(2)),
      buyPlatform: buy.platformSource,
      sellPlatform: sell.platformSource,
      buyDate: buy.tradedAt,
      sellDate: sell.tradedAt,
    });
  }
}

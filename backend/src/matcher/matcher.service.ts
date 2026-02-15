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
   * Match buy (CSFloat) and sell (Market.CSGO) trades for the same item
   * to calculate profit.
   */
  async getMatchedTrades() {
    const buyTrades = await this.prisma.trade.findMany({
      where: { type: 'BUY' },
      include: { item: true },
    });

    const sellTrades = await this.prisma.trade.findMany({
      where: { type: 'SELL' },
      include: { item: true },
    });

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

    for (const sell of sellTrades) {
      const sellNorm = this.normalizer.normalizeItem(sell.item);

      // Try match by asset_id first
      let buyMatch = sell.item.assetId
        ? buyTrades.find((b) => b.item.assetId === sell.item.assetId)
        : null;

      // Fallback: match by name + float
      if (!buyMatch && sell.item.floatValue !== null) {
        buyMatch = buyTrades.find((b) => {
          const buyNorm = this.normalizer.normalizeItem(b.item);
          return (
            buyNorm.normalizedName === sellNorm.normalizedName &&
            buyNorm.floatValue !== null &&
            Math.abs(buyNorm.floatValue - sellNorm.floatValue!) < 0.0000001
          );
        });
      }

      if (buyMatch && buyMatch.buyPrice && sell.sellPrice) {
        const commission = sell.commission || 0.02;
        const netSell = sell.sellPrice * (1 - commission);
        const profit = netSell - buyMatch.buyPrice;
        const profitPercent = (profit / buyMatch.buyPrice) * 100;

        matched.push({
          itemName: sell.item.name,
          imageUrl: sell.item.imageUrl || buyMatch.item.imageUrl || null,
          buyPrice: buyMatch.buyPrice,
          sellPrice: sell.sellPrice,
          commission,
          netSell: parseFloat(netSell.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitPercent: parseFloat(profitPercent.toFixed(2)),
          buyPlatform: buyMatch.platformSource,
          sellPlatform: sell.platformSource,
          buyDate: buyMatch.tradedAt,
          sellDate: sell.tradedAt,
        });
      }
    }

    return matched;
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateManualItemDto {
  name: string;
  wear?: string;
  floatValue?: number;
  buyPrice: number;
  currency?: string;
  customSource: string; // e.g. "Buff", "Waxpeer"
  purchaseDate: string; // ISO date
  tradeBanDate?: string; // ISO date, or null if tradable
  status: string; // "Trade Ban", "Tradable", etc.
}

export interface CreateManualSaleDto {
  itemId: string;
  sellPrice: number;
  currency?: string;
  customSource: string; // e.g. "Buff"
  saleDate: string; // ISO date
}

@Injectable()
export class ManualService {
  private readonly logger = new Logger(ManualService.name);

  constructor(private readonly prisma: PrismaService) { }

  async createItem(dto: CreateManualItemDto) {
    const externalId = `manual_${uuidv4()}`;
    const purchaseDate = new Date(dto.purchaseDate);
    const tradeBanDate = dto.tradeBanDate ? new Date(dto.tradeBanDate) : null;

    // Determine status
    // If tradeBanDate > now, it's TRADE_HOLD. Else COMPLETED.
    // Or use user provided status.
    const now = new Date();
    let tradeStatus: 'TRADE_HOLD' | 'COMPLETED' = 'COMPLETED';

    if (tradeBanDate && tradeBanDate > now) {
      tradeStatus = 'TRADE_HOLD';
    } else if (dto.status === 'Trade Ban') {
      tradeStatus = 'TRADE_HOLD';
    }

    // Create Item
    const item = await this.prisma.item.create({
      data: {
        externalId,
        platformSource: 'MANUAL',
        customSource: dto.customSource,
        name: dto.name,
        wear: dto.wear,
        floatValue: dto.floatValue,
        // imageUrl: try to find existing image for same name? Optional.
      },
    });

    // Compute tradeUnlockAt for trade ban timer
    let tradeUnlockAt: Date | null = null;
    if (tradeBanDate) {
      tradeUnlockAt = tradeBanDate;
    } else if (tradeStatus === 'TRADE_HOLD') {
      // Default: 7-day Steam trade ban from purchase date
      tradeUnlockAt = new Date(purchaseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Create BUY Trade
    const trade = await this.prisma.trade.create({
      data: {
        externalId: `trade_buy_${externalId}`,
        platformSource: 'MANUAL',
        customSource: dto.customSource,
        itemId: item.id,
        buyPrice: dto.buyPrice,
        type: 'BUY',
        status: tradeStatus,
        tradedAt: purchaseDate,
        tradeUnlockAt,
      },
    });

    // Create Listing (optional, to show it in inventory)
    // Inventory logic usually checks listings or buy trades without sell trades.
    // Let's create a listing so it appears consistent with other platforms if needed.
    // But manual items might not be "listed" yet.
    // However, MatcherService looks at listings for price? No, it looks at trades.
    // Let's NOT create a listing for now, unless user says "Listed".

    return { item, trade };
  }

  async createSale(dto: CreateManualSaleDto) {
    const item = await this.prisma.item.findUnique({
      where: { id: dto.itemId },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check if already sold
    const existingSell = await this.prisma.trade.findFirst({
      where: {
        itemId: dto.itemId,
        type: 'SELL',
        status: { not: 'CANCELLED' },
      },
    });

    if (existingSell) {
      throw new Error('Item is already sold');
    }

    const saleDate = new Date(dto.saleDate);

    // Create SELL Trade
    const trade = await this.prisma.trade.create({
      data: {
        externalId: `trade_sell_${uuidv4()}`,
        platformSource: 'MANUAL',
        customSource: dto.customSource,
        itemId: item.id,
        sellPrice: dto.sellPrice,
        commission: 0, // Manual sale commission? User didn't specify. Assume 0 or let user edit later.
        type: 'SELL',
        status: 'COMPLETED', // Sales are usually completed immediately if manual
        tradedAt: saleDate,
      },
    });

    return trade;
  }

  async getManualItems() {
    // Fetch all manual items
    return this.prisma.item.findMany({
      where: { platformSource: 'MANUAL' },
      include: { trades: true }
    });
  }

  async deleteTrade(tradeId: string) {
    const trade = await this.prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error('Trade not found');
    return this.prisma.trade.delete({ where: { id: tradeId } });
  }

  async updateTrade(tradeId: string, dto: { price?: number; date?: string; customSource?: string }) {
    const trade = await this.prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) throw new Error('Trade not found');

    const data: any = {};
    if (dto.price !== undefined) {
      if (trade.type === 'BUY') data.buyPrice = dto.price;
      else data.sellPrice = dto.price;
    }
    if (dto.date !== undefined) {
      data.tradedAt = new Date(dto.date);
    }
    if (dto.customSource !== undefined) {
      data.customSource = dto.customSource;
    }

    return this.prisma.trade.update({
      where: { id: tradeId },
      data,
    });
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');

    if (item.platformSource !== 'MANUAL') {
      throw new Error('Cannot delete non-manual item');
    }

    await this.prisma.trade.deleteMany({ where: { itemId } });
    await this.prisma.listing.deleteMany({ where: { itemId } });

    return this.prisma.item.delete({ where: { id: itemId } });
  }
}

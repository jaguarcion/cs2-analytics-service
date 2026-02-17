import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CsfloatService } from '../collectors/csfloat/csfloat.service';
import { MarketCsgoService } from '../collectors/market-csgo/market-csgo.service';
import { NotificationService } from '../notification/notification.service';
import axios from 'axios';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly csfloatService: CsfloatService,
    private readonly marketCsgoService: MarketCsgoService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) { }

  @Post('test-notification')
  async testNotification(
    @Body() body: { itemName: string; platform?: string; price?: number; currency?: string },
  ) {
    const platform = body.platform || 'MARKET_CSGO';
    const price = body.price || 0;
    const currency = body.currency || (platform === 'MARKET_CSGO' ? 'RUB' : 'USD');

    await this.notificationService.checkAndNotify(
      {
        itemName: body.itemName,
        platform,
        price,
        currency,
      },
      `test-${Date.now()}`,
    );

    return { ok: true, message: `Notification check triggered for "${body.itemName}" sold on ${platform}` };
  }

  @Post('test-telegram-ping')
  async testTelegramPing() {
    const sent = await this.notificationService.sendTestMessage('✅ CS2 Analytics — Telegram бот работает!');
    return { ok: sent, message: sent ? 'Message sent' : 'Failed to send — check logs' };
  }

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

  @Get('insale')
  async getInSale() {
    const steamId = this.config.get('CSFLOAT_STEAM_ID', '');
    if (!steamId) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://csfloat.com/api/v1/users/${steamId}/stall`,
        { timeout: 15000 },
      );

      const data = response.data?.data || [];

      return data.map((listing: any) => ({
        id: listing.id,
        name: listing.item?.market_hash_name || 'Unknown',
        itemName: listing.item?.item_name || '',
        wear: listing.item?.wear_name || null,
        floatValue: listing.item?.float_value || null,
        price: listing.price / 100, // cents → USD
        referencePrice: listing.reference?.predicted_price
          ? listing.reference.predicted_price / 100
          : null,
        basePrice: listing.reference?.base_price
          ? listing.reference.base_price / 100
          : null,
        quantity: listing.reference?.quantity || null,
        watchers: listing.watchers || 0,
        createdAt: listing.created_at,
        imageUrl: listing.item?.icon_url
          ? `https://community.akamai.steamstatic.com/economy/image/${listing.item.icon_url}`
          : null,
        isStattrak: listing.item?.is_stattrak || false,
        isSouvenir: listing.item?.is_souvenir || false,
        type: listing.item?.type || 'skin',
        rarity: listing.item?.rarity_name || null,
        collection: listing.item?.collection || null,
        stickers: listing.item?.stickers?.map((s: any) => ({
          name: s.name,
          iconUrl: s.icon_url,
        })) || [],
      }));
    } catch (error) {
      console.error('Failed to fetch CSFloat stall:', error.message);
      return [];
    }
  }

  @Get('market-insale')
  async getMarketInSale() {
    try {
      const trades = await this.marketCsgoService.fetchActiveTrades();

      // Get IDs of items already sold on Market.CSGO (COMPLETED / TRADE_HOLD)
      const soldTrades = await this.prisma.trade.findMany({
        where: {
          platformSource: 'MARKET_CSGO',
          type: 'SELL',
          status: { in: ['COMPLETED', 'TRADE_HOLD'] },
        },
        select: { externalId: true },
      });
      const soldIds = new Set(soldTrades.map((t) => t.externalId).filter(Boolean));

      const filtered = trades.filter((t) => !soldIds.has(t.id));

      return filtered.map((trade) => ({
        id: trade.id,
        name: trade.market_hash_name,
        itemName: trade.market_hash_name.replace(/\s*\([^)]+\)\s*$/, ''),
        wear: parseWearFromMarketName(trade.market_hash_name),
        floatValue: trade.float || null,
        price: trade.price, // RUB
        currency: 'RUB',
        createdAt: trade.created_at || new Date().toISOString(),
        imageUrl: trade.class_id
          ? `https://steamcommunity.com/economy/image/class/730/${trade.class_id}/${trade.instance_id || '0'}`
          : null,
        isStattrak: trade.market_hash_name.startsWith('StatTrak'),
        isSouvenir: trade.market_hash_name.startsWith('Souvenir'),
      }));
    } catch (error) {
      console.error('Failed to fetch Market.CSGO active items:', error.message);
      return [];
    }
  }
}

function parseWearFromMarketName(name: string): string | null {
  const match = name.match(/\(([^)]+)\)\s*$/);
  if (match) {
    const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    if (wears.includes(match[1])) return match[1];
  }
  return null;
}

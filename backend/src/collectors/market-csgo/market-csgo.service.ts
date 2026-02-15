import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

export interface MarketTrade {
  id: string;
  market_hash_name: string;
  float?: number;
  price: number;
  currency: string;
  status: string;
  created_at?: string;
  asset_id?: string;
  class_id?: string;
  instance_id?: string;
  settlement?: number;
  live_time?: number;
  left?: number;
  event?: 'buy' | 'sell';
  stage?: string;
  _source?: 'active' | 'history';
}

export interface WithdrawRate {
  rate: number;
  currency_from: string;
  currency_to: string;
}

const WEAR_NAMES: Record<string, string> = {
  'Factory New': 'Factory New',
  'Minimal Wear': 'Minimal Wear',
  'Field-Tested': 'Field-Tested',
  'Well-Worn': 'Well-Worn',
  'Battle-Scarred': 'Battle-Scarred',
};

function parseWearFromName(name: string): string | null {
  const match = name.match(/\(([^)]+)\)\s*$/);
  if (match) {
    const inner = match[1];
    if (WEAR_NAMES[inner]) return WEAR_NAMES[inner];
  }
  return null;
}

@Injectable()
export class MarketCsgoService {
  private readonly logger = new Logger(MarketCsgoService.name);
  private readonly client: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = axios.create({
      baseURL: this.config.get('MARKET_CSGO_BASE_URL', 'https://market.csgo.com'),
      params: {
        key: this.config.get('MARKET_CSGO_API_KEY'),
      },
      timeout: 15000,
    });
  }

  async fetchActiveTrades(): Promise<MarketTrade[]> {
    try {
      // /api/v2/items — items currently on sale
      const response = await this.client.get('/api/v2/items');
      const data = response.data;
      if (!data?.success) {
        this.logger.warn(`Market.CSGO items response: ${JSON.stringify(data).slice(0, 500)}`);
      }
      const items = data?.items || [];
      this.logger.log(`Market.CSGO items: got ${items.length} items`);
      return items.map((item: any) => ({
        id: String(item.item_id || item.id || item.class_id),
        market_hash_name: item.market_hash_name || '',
        float: item.float ? parseFloat(item.float) : undefined,
        price: item.price || 0, // already in RUB
        currency: item.currency || 'RUB',
        status: String(item.status ?? 'on_sale'),
        created_at: item.created_at || item.stamp,
        asset_id: item.asset_id || item.assetid,
        class_id: item.classid || item.class_id,
        instance_id: item.instanceid || item.instance_id,
        settlement: item.settlement ? Number(item.settlement) : undefined,
        live_time: item.live_time ? Number(item.live_time) : undefined,
        left: item.left ? Number(item.left) : undefined,
        _source: 'active' as const,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Market.CSGO items: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data).slice(0, 500)}`);
      }
      throw error;
    }
  }

  async fetchHistory(): Promise<MarketTrade[]> {
    try {
      // /api/v2/history — purchase and sale history
      const response = await this.client.get('/api/v2/history');
      const data = response.data;
      if (!data?.success) {
        this.logger.warn(`Market.CSGO history response: ${JSON.stringify(data).slice(0, 500)}`);
      }
      const items = data?.history || [];
      this.logger.log(`Market.CSGO history raw: got ${items.length} items`);
      return items.map((item: any) => ({
        id: String(item.item_id || item.id),
        market_hash_name: item.market_hash_name || '',
        float: item.float ? parseFloat(item.float) : undefined,
        price: item.received || item.paid || item.price || 0,
        currency: item.currency || 'RUB',
        status: item.stage || item.status || 'completed',
        created_at: item.time ? new Date(item.time * 1000).toISOString() : undefined,
        asset_id: item.asset_id || item.assetid,
        class_id: item.class || item.classid || item.class_id,
        instance_id: item.instance || item.instanceid || item.instance_id,
        settlement: item.settlement ? Number(item.settlement) : undefined,
        event: item.event,
        stage: item.stage,
        _source: 'history' as const,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Market.CSGO history: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data).slice(0, 500)}`);
      }
      throw error;
    }
  }

  private buildInspectUrl(classId: string, assetId: string, instanceId?: string) {
    return `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M${classId}A${assetId}D${instanceId || '0'}`;
  }

  private async fetchFloatFromCsfloat(inspectUrl: string, assetId: string): Promise<number | null> {
    const apiKey = this.config.get('CSFLOAT_API_KEY');
    if (!apiKey) {
      return null; // no Pro key — skip call entirely
    }
    try {
      const response = await axios.get(`https://csfloat.com/api/v1/inspect`, {
        params: { url: inspectUrl },
        timeout: 10000,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const float = response.data?.iteminfo?.floatvalue;
      if (float !== undefined && float !== null) {
        this.logger.debug(`Got float ${float} for asset ${assetId} via CSFloat`);
        return parseFloat(float);
      }
    } catch (error) {
      this.logger.warn(`CSFloat inspect failed for asset ${assetId}: ${error.message}`);
    }
    return null;
  }

  private async fetchFloatFromCsgofloat(inspectUrl: string, assetId: string): Promise<number | null> {
    try {
      const response = await axios.get('https://api.csgofloat.com/', {
        params: { url: inspectUrl },
        timeout: 10000,
      });
      const float = response.data?.iteminfo?.floatvalue;
      if (float !== undefined && float !== null) {
        this.logger.debug(`Got float ${float} for asset ${assetId} via csgofloat`);
        return parseFloat(float);
      }
    } catch (error) {
      this.logger.warn(`csgofloat inspect failed for asset ${assetId}: ${error.message}`);
    }
    return null;
  }

  private async fetchFloatForTrade(trade: MarketTrade): Promise<number | null> {
    if (!trade.asset_id || !trade.class_id) {
      return null;
    }
    const inspectUrl = this.buildInspectUrl(trade.class_id, trade.asset_id, trade.instance_id || undefined);

    // Try CSFloat Pro inspect first (if key available)
    let floatValue = await this.fetchFloatFromCsfloat(inspectUrl, trade.asset_id);

    // Fallback to csgofloat public API
    if (floatValue === null) {
      floatValue = await this.fetchFloatFromCsgofloat(inspectUrl, trade.asset_id);
    }

    return floatValue;
  }

  async fetchWithdrawRate(): Promise<WithdrawRate | null> {
    // 1. Get balance from Market.CSGO
    try {
      const balanceRes = await this.client.get('/api/GetMoney');
      const balance = (balanceRes.data?.money || 0) / 100;
      this.logger.log(`Market.CSGO balance: ${balance} RUB`);
    } catch (error) {
      this.logger.warn(`Market.CSGO GetMoney failed: ${error.message}`);
    }

    // 2. Get USDT→RUB rate from public API
    try {
      const rateRes = await axios.get(
        'https://api.exchangerate-api.com/v4/latest/USD',
        { timeout: 10000 },
      );
      const rubRate = rateRes.data?.rates?.RUB;
      if (rubRate) {
        // Add 3% commission for Market.CSGO withdrawal
        const rateWithCommission = rubRate * 1.03;
        this.logger.log(`USDT→RUB rate: ${rubRate} → ${rateWithCommission.toFixed(2)} (с комиссией 3%)`);
        return {
          rate: parseFloat(rateWithCommission.toFixed(2)),
          currency_from: 'USDT',
          currency_to: 'RUB',
        };
      }
    } catch (error) {
      this.logger.warn(`Exchange rate API failed: ${error.message}`);
    }

    // 3. Fallback: try guarantex or return null
    this.logger.warn('Could not fetch USDT→RUB rate from any source');
    return null;
  }

  async syncTrades(): Promise<number> {
    const startedAt = new Date();
    let itemsProcessed = 0;

    try {
      // Fetch both active items and history
      const [activeItems, historyItems] = await Promise.allSettled([
        this.fetchActiveTrades(),
        this.fetchHistory(),
      ]);

      const trades: MarketTrade[] = [
        ...(activeItems.status === 'fulfilled' ? activeItems.value : []),
        ...(historyItems.status === 'fulfilled' ? historyItems.value : []),
      ];

      // Deduplicate by id — prefer history (sold) over active
      const tradeMap = new Map<string, MarketTrade>();
      for (const t of trades) {
        const existing = tradeMap.get(t.id);
        if (!existing || t._source === 'history') {
          tradeMap.set(t.id, t);
        }
      }
      const uniqueTrades = Array.from(tradeMap.values());

      for (const trade of uniqueTrades) {
        if (!trade.market_hash_name) continue;

        // Build image URL from market_hash_name via Steam Community
        const imageUrl = `https://steamcommunity.com/economy/image/class/730/${trade.class_id || '0'}/${trade.instance_id || '0'}`;

        const wear = parseWearFromName(trade.market_hash_name);

        // Try to fetch float via inspect APIs if not provided by Market.CSGO
        let floatValue = trade.float || null;
        if (!floatValue) {
          const fetchedFloat = await this.fetchFloatForTrade(trade);
          if (fetchedFloat !== null) {
            floatValue = fetchedFloat;
          }
        }

        const item = await this.prisma.item.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'MARKET_CSGO',
              externalId: trade.id,
            },
          },
          update: {
            name: trade.market_hash_name,
            wear,
            floatValue,
            imageUrl: trade.class_id ? imageUrl : null,
          },
          create: {
            externalId: trade.id,
            platformSource: 'MARKET_CSGO',
            name: trade.market_hash_name,
            wear,
            floatValue,
            imageUrl: trade.class_id ? imageUrl : null,
          },
        });

        // Determine status based on source and numeric status
        const listingStatus = this.mapListingStatus(trade.status);
        const tradeStatus = this.mapTradeStatus(trade);

        await this.prisma.listing.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'MARKET_CSGO',
              externalId: trade.id,
            },
          },
          update: {
            price: trade.price,
            status: listingStatus,
          },
          create: {
            externalId: trade.id,
            itemId: item.id,
            platformSource: 'MARKET_CSGO',
            price: trade.price,
            currency: trade.currency || 'RUB',
            status: listingStatus,
            listedAt: trade.created_at ? new Date(trade.created_at) : new Date(),
          },
        });

        // Also create a SELL trade record for profit calculation
        await this.prisma.trade.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'MARKET_CSGO',
              externalId: trade.id,
            },
          },
          update: {
            sellPrice: trade.price,
            commission: 0.05,
            status: tradeStatus,
          },
          create: {
            externalId: trade.id,
            platformSource: 'MARKET_CSGO',
            itemId: item.id,
            sellPrice: trade.price,
            commission: 0.05,
            type: 'SELL',
            status: tradeStatus,
            tradedAt: trade.created_at ? new Date(trade.created_at) : new Date(),
          },
        });

        itemsProcessed++;
      }

      await this.prisma.syncLog.create({
        data: {
          source: 'market_trades',
          status: 'success',
          itemsProcessed,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`Market.CSGO trades synced: ${itemsProcessed} items`);
      return itemsProcessed;
    } catch (error) {
      await this.prisma.syncLog.create({
        data: {
          source: 'market_trades',
          status: 'error',
          itemsProcessed,
          errorMessage: error.message,
          startedAt,
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async syncWithdrawRate(): Promise<number> {
    const startedAt = new Date();

    try {
      const rateData = await this.fetchWithdrawRate();

      if (rateData && rateData.rate > 0) {
        await this.prisma.fxRate.create({
          data: {
            pair: `${rateData.currency_from}_${rateData.currency_to}`,
            rate: rateData.rate,
            source: 'market_csgo',
            fetchedAt: new Date(),
          },
        });
      }

      await this.prisma.syncLog.create({
        data: {
          source: 'market_rate',
          status: 'success',
          itemsProcessed: 1,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`Market.CSGO withdraw rate synced: ${rateData?.rate}`);
      return rateData?.rate || 0;
    } catch (error) {
      await this.prisma.syncLog.create({
        data: {
          source: 'market_rate',
          status: 'error',
          errorMessage: error.message,
          startedAt,
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private mapListingStatus(status: string): 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'DELISTED' {
    // Market.CSGO numeric statuses from /api/v2/items:
    // 1 = on sale, 2 = sold (need to give item), 3 = waiting for seller,
    // 4 = can pick up purchased item
    switch (status) {
      case '1':
      case 'active':
      case 'on_sale':
        return 'ACTIVE';
      case '2':
      case '3':
      case '4':
      case '7':
      case 'sold':
      case 'completed':
        return 'SOLD';
      case 'cancelled':
        return 'CANCELLED';
      case 'delisted':
        return 'DELISTED';
      default:
        return 'ACTIVE';
    }
  }

  private mapTradeStatus(
    trade: MarketTrade,
  ): 'PENDING' | 'COMPLETED' | 'TRADE_HOLD' | 'ACCEPTED' {
    // History items with stage=2 (ITEM_GIVEN) or stage=5 (TIMED_OUT) are completed
    if (trade._source === 'history') {
      return 'COMPLETED';
    }

    // Active items statuses from /api/v2/items:
    // 1 = on sale, 2 = sold (need to give item), 3 = waiting for seller, 4 = can pick up
    const s = trade.status;

    // settlement > 0 means trade successful, item delivered, waiting for finalization
    if (trade.settlement && trade.settlement > 0) {
      return 'COMPLETED';
    }

    // status 2 = sold, need to give item to bot (trade in progress)
    // status 3 = waiting for seller to send item
    if (s === '2' || s === '3') {
      return 'TRADE_HOLD';
    }

    // status 4 = can pick up purchased item
    if (s === '4') {
      return 'ACCEPTED';
    }

    // status 1 = on sale
    if (s === '1' || s === 'active' || s === 'on_sale') {
      return 'PENDING';
    }

    // status 7 = sold/completed (legacy)
    if (s === '7' || s === 'sold' || s === 'completed') {
      return 'COMPLETED';
    }

    return 'PENDING';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

export interface CsfloatStallItem {
  id: string;
  item: {
    market_hash_name: string;
    wear_name?: string;
    float_value?: number;
    asset_id?: string;
    icon_url?: string;
  };
  price: number;
  created_at: string;
  state: string;
  sold_at?: string;
  verify_sale_at?: string;
  // Extended fields from API for trade hold detection
  trade?: {
    state?: string;
    contract_state?: string;
    verify_at?: string;
  };
  contract?: {
    state?: string;
    sold_at?: string;
    verify_sale_at?: string;
  };
}

export interface CsfloatTrade {
  id: string;
  state: string;
  created_at: string;
  verify_sale_at?: string;
  price?: number;
  buyer_id?: string;
  seller_id?: string;
  buyer?: { steam_id?: string };
  seller?: { steam_id?: string };
  contract?: {
    price?: number;
    state?: string;
    created_at?: string;
    item?: {
      market_hash_name: string;
      wear_name?: string;
      float_value?: number;
      asset_id?: string;
      icon_url?: string;
    };
  };
  item?: {
    market_hash_name: string;
    wear_name?: string;
    float_value?: number;
    asset_id?: string;
    icon_url?: string;
  };
}

@Injectable()
export class CsfloatService {
  private readonly logger = new Logger(CsfloatService.name);
  private readonly client: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.client = axios.create({
      baseURL: this.config.get('CSFLOAT_BASE_URL', 'https://csfloat.com/api/v1'),
      headers: {
        Authorization: this.config.get('CSFLOAT_API_KEY'),
      },
      timeout: 15000,
    });
    this.mySteamId = this.config.get('CSFLOAT_STEAM_ID', '');
  }

  private readonly mySteamId: string;

  async fetchStall(): Promise<CsfloatStallItem[]> {
    // Try multiple known endpoints for user's own listings
    const endpoints = ['/me/stall', '/me/listings'];
    for (const endpoint of endpoints) {
      try {
        const response = await this.client.get(endpoint);
        const data = response.data;
        const items = Array.isArray(data) ? data : (data?.data || data?.listings || []);
        this.logger.log(`CSFloat stall (${endpoint}): got ${items.length} items`);
        return items;
      } catch (error) {
        this.logger.warn(`CSFloat ${endpoint} failed: ${error.response?.status || error.message}`);
      }
    }

    // Fallback: use /listings with seller_id from env or extracted from trades
    try {
      const sellerId = this.config.get('CSFLOAT_SELLER_ID');
      if (sellerId) {
        const response = await this.client.get('/listings', {
          params: { seller_id: sellerId, state: 'listed' },
        });
        const data = response.data;
        const items = Array.isArray(data) ? data : (data?.data || []);
        this.logger.log(`CSFloat stall (public /listings): got ${items.length} items`);
        return items;
      }
    } catch (error) {
      this.logger.warn(`CSFloat public /listings fallback failed: ${error.response?.status || error.message}`);
    }

    this.logger.warn('CSFloat stall: all endpoints failed, returning empty');
    return [];
  }

  async fetchTrades(): Promise<CsfloatTrade[]> {
    const seenIds = new Set<string>();
    const allTrades: CsfloatTrade[] = [];
    const limit = 100;
    let page = 0;

    try {
      while (true) {
        const params: Record<string, any> = { limit, page };
        const response = await this.client.get('/me/trades', { params });
        const data = response.data;
        const trades: CsfloatTrade[] = Array.isArray(data)
          ? data
          : (data?.trades || data?.data || []);

        this.logger.log(`CSFloat trades page=${page}: got ${trades.length} items`);

        if (trades.length === 0) break;

        let newCount = 0;
        for (const t of trades) {
          const tid = String(t.id);
          if (!seenIds.has(tid)) {
            seenIds.add(tid);
            allTrades.push(t);
            newCount++;
          }
        }

        this.logger.log(`CSFloat trades page=${page}: ${newCount} new unique items`);

        // If no new unique trades found, we've exhausted the data
        if (newCount === 0) break;

        // If we got fewer than limit, this is the last page
        if (trades.length < limit) break;

        page++;

        // Delay between pages to avoid rate limiting
        await new Promise((r) => setTimeout(r, 1000));

        // Safety cap — max 100 pages (10000 trades)
        if (page > 100) {
          this.logger.warn('CSFloat trades: reached page cap (100), stopping');
          break;
        }
      }

      this.logger.log(`CSFloat trades total: ${allTrades.length} unique items`);

      if (!this.mySteamId && allTrades.length > 0) {
        const t0 = allTrades[0];
        const bid = t0.buyer_id || t0.buyer?.steam_id || '';
        this.logger.warn(`CSFLOAT_STEAM_ID not set in .env! Detected buyer: ${bid}. Add it to enable BUY/SELL detection.`);
      }
      return allTrades;
    } catch (error) {
      this.logger.error(`Failed to fetch CSFloat trades: ${error.message}`);
      if (error.response) {
        this.logger.error(`CSFloat trades response: ${error.response.status} ${JSON.stringify(error.response.data).slice(0, 300)}`);
      }
      if (allTrades.length > 0) {
        this.logger.warn(`Returning ${allTrades.length} partial trades`);
        return allTrades;
      }
      throw error;
    }
  }

  async syncStall(): Promise<number> {
    const startedAt = new Date();
    let itemsProcessed = 0;

    try {
      const stallItems = await this.fetchStall();

      for (const stallItem of stallItems) {
        const item = await this.prisma.item.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'CSFLOAT',
              externalId: stallItem.id,
            },
          },
          update: {
            name: stallItem.item.market_hash_name,
            wear: stallItem.item.wear_name || null,
            floatValue: stallItem.item.float_value || null,
            assetId: stallItem.item.asset_id || null,
            imageUrl: stallItem.item.icon_url || null,
          },
          create: {
            externalId: stallItem.id,
            platformSource: 'CSFLOAT',
            name: stallItem.item.market_hash_name,
            wear: stallItem.item.wear_name || null,
            floatValue: stallItem.item.float_value || null,
            assetId: stallItem.item.asset_id || null,
            imageUrl: stallItem.item.icon_url || null,
          },
        });

        // Determine if item is sold but in trade hold (trade ban)
        // state='listed' = actually on sale
        // state='sold' or contract.state='sold' = sold, waiting for delivery (trade hold)
        const isListed = stallItem.state === 'listed';
        const isSold = stallItem.state === 'sold' || stallItem.contract?.state === 'sold';
        const tradeState = stallItem.trade?.state || '';
        const contractState = stallItem.contract?.state || stallItem.contract?.state || '';

        // Determine listing status
        let listingStatus: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'DELISTED';
        let tradeStatus: 'PENDING' | 'COMPLETED' | 'TRADE_HOLD' | 'ACCEPTED' | 'CANCELLED';

        if (isListed) {
          listingStatus = 'ACTIVE';
          tradeStatus = 'PENDING';
        } else if (isSold) {
          listingStatus = 'SOLD';
          // Check if still in trade hold (pending/queued delivery) or completed
          if (tradeState === 'pending' || tradeState === 'queued' || contractState === 'sold') {
            tradeStatus = 'TRADE_HOLD';
          } else {
            tradeStatus = 'COMPLETED';
          }
        } else {
          listingStatus = 'SOLD';
          tradeStatus = 'COMPLETED';
        }

        await this.prisma.listing.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'CSFLOAT',
              externalId: stallItem.id,
            },
          },
          update: {
            price: stallItem.price / 100,
            status: listingStatus,
            listedAt: new Date(stallItem.created_at),
          },
          create: {
            externalId: stallItem.id,
            itemId: item.id,
            platformSource: 'CSFLOAT',
            price: stallItem.price / 100,
            currency: 'USD',
            status: listingStatus,
            listedAt: new Date(stallItem.created_at),
          },
        });

        // NOTE: Trade records are NOT created here to avoid duplicates.
        // All SELL trades are handled exclusively by syncTrades() via /me/trades endpoint.

        itemsProcessed++;
      }

      await this.prisma.syncLog.create({
        data: {
          source: 'csfloat_stall',
          status: 'success',
          itemsProcessed,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`CSFloat stall synced: ${itemsProcessed} items`);
      return itemsProcessed;
    } catch (error) {
      await this.prisma.syncLog.create({
        data: {
          source: 'csfloat_stall',
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

  async syncTrades(): Promise<number> {
    const startedAt = new Date();
    let itemsProcessed = 0;

    try {
      // Clean up legacy stall_ duplicates (from old syncStall logic that created Trade records)
      const stallCleanup = await this.prisma.trade.deleteMany({
        where: { externalId: { startsWith: 'stall_' }, platformSource: 'CSFLOAT' },
      });
      if (stallCleanup.count > 0) {
        this.logger.log(`Cleaned up ${stallCleanup.count} legacy stall_ trade duplicates`);
      }

      const trades = await this.fetchTrades();

      for (const trade of trades) {
        // CSFloat trade structure: trade.contract.item has the skin data
        const contract = trade.contract || trade;
        const itemData = contract?.item || trade?.item;

        if (!itemData?.market_hash_name) {
          this.logger.warn(`CSFloat trade ${trade.id}: no item data, skipping`);
          continue;
        }

        const item = await this.prisma.item.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'CSFLOAT',
              externalId: `trade_${trade.id}`,
            },
          },
          update: {
            name: itemData.market_hash_name,
            wear: itemData.wear_name || null,
            floatValue: itemData.float_value || null,
            assetId: itemData.asset_id || null,
            imageUrl: itemData.icon_url || null,
          },
          create: {
            externalId: `trade_${trade.id}`,
            platformSource: 'CSFLOAT',
            name: itemData.market_hash_name,
            wear: itemData.wear_name || null,
            floatValue: itemData.float_value || null,
            assetId: itemData.asset_id || null,
            imageUrl: itemData.icon_url || null,
          },
        });

        // Determine trade direction: BUY if user is buyer, SELL if user is seller
        const buyerId = trade.buyer_id || trade.buyer?.steam_id || '';
        const sellerId = trade.seller_id || trade.seller?.steam_id || '';
        const isBuyer = this.mySteamId
          ? buyerId === this.mySteamId
          : true; // default to BUY if steam_id not configured

        // Determine status from both trade.state and contract.state
        const contractState = contract?.state || '';
        const tradeState = trade.state || '';
        const tradeStatus = this.mapCombinedStatus(tradeState, contractState);

        const price = contract?.price || trade.price || 0;
        const priceUsd = price / 100;
        const createdAt = trade.created_at || contract?.created_at;
        const tradeType = isBuyer ? 'BUY' : 'SELL';

        await this.prisma.trade.upsert({
          where: {
            platformSource_externalId: {
              platformSource: 'CSFLOAT',
              externalId: trade.id,
            },
          },
          update: {
            buyPrice: isBuyer ? priceUsd : null,
            sellPrice: !isBuyer ? priceUsd : null,
            commission: 0.02,
            type: tradeType,
            status: tradeStatus,
            tradedAt: createdAt ? new Date(createdAt) : new Date(),
            tradeUnlockAt: trade.verify_sale_at ? new Date(trade.verify_sale_at) : null,
          },
          create: {
            externalId: trade.id,
            platformSource: 'CSFLOAT',
            itemId: item.id,
            buyPrice: isBuyer ? priceUsd : null,
            sellPrice: !isBuyer ? priceUsd : null,
            commission: 0.02,
            type: tradeType,
            status: tradeStatus,
            tradedAt: createdAt ? new Date(createdAt) : new Date(),
            tradeUnlockAt: trade.verify_sale_at ? new Date(trade.verify_sale_at) : null,
          },
        });

        itemsProcessed++;
      }

      await this.prisma.syncLog.create({
        data: {
          source: 'csfloat_trades',
          status: 'success',
          itemsProcessed,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`CSFloat trades synced: ${itemsProcessed} items`);
      return itemsProcessed;
    } catch (error) {
      await this.prisma.syncLog.create({
        data: {
          source: 'csfloat_trades',
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

  private mapCombinedStatus(
    tradeState: string,
    contractState: string,
  ): 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'TRADE_HOLD' {
    // Real CSFloat states:
    // trade:pending / contract:sold   → trade ban (awaiting delivery) → TRADE_HOLD
    // trade:queued  / contract:sold   → in queue for delivery → TRADE_HOLD
    // trade:completed / contract:sold → fully done → COMPLETED
    // trade:failed  / contract:refunded → failed trade → CANCELLED

    if (tradeState === 'failed' || contractState === 'refunded') {
      return 'CANCELLED';
    }
    if (tradeState === 'completed') {
      return 'COMPLETED';
    }
    if (contractState === 'sold' || contractState === 'completed') {
      // Item sold but trade not yet completed → trade hold (trade ban)
      if (tradeState === 'pending' || tradeState === 'queued' || tradeState === 'accepted') {
        return 'TRADE_HOLD';
      }
      return 'COMPLETED';
    }
    if (contractState === 'listed') {
      return 'PENDING'; // still listed, not yet sold
    }
    if (tradeState === 'accepted') {
      return 'ACCEPTED';
    }
    return 'PENDING';
  }
}

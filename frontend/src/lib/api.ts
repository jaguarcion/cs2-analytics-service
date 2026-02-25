import axios from 'axios';
import { getToken, removeToken } from './auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export interface AnalyticsSummary {
  inventoryValue: number;
  inventoryCount: number;
  totalPurchases: number;
  purchasesCount: number;
  totalSales: number;
  salesCount: number;
  totalProfit: number;
  profitPercent: number;
  fxRate: { pair: string; rate: number; fetchedAt: string } | null;
}

export interface TradeItem {
  id: string;
  externalId: string;
  platformSource: string;
  customSource: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
  commission: number | null;
  type: string;
  status: string;
  tradedAt: string;
  tradeUnlockAt?: string | null;
  item?: {
    id: string;
    name: string;
    wear: string | null;
    floatValue: number | null;
    imageUrl: string | null;
  };
}

export interface ProfitEntry {
  sellTradeId: string;
  buyTradeId: string;
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
  buyCustomSource: string | null;
  sellCustomSource: string | null;
  buyDate: string | null;
  sellDate: string | null;
}

export interface SyncLog {
  id: string;
  source: string;
  status: string;
  itemsProcessed: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export type Period = 'week' | 'month' | '3months' | 'custom';
export type Platform = 'ALL' | 'CSFLOAT' | 'MARKET_CSGO' | 'MANUAL';

interface QueryParams {
  period?: string;
  platform?: string;
  from?: string;
  to?: string;
}

export async function fetchSummary(params: QueryParams): Promise<AnalyticsSummary> {
  const { data } = await api.get('/analytics/summary', { params });
  return data;
}

export async function fetchPurchases(params: QueryParams & { hidden?: boolean }): Promise<TradeItem[]> {
  const { data } = await api.get('/analytics/purchases', {
    params: { ...params, hidden: params.hidden ? 'true' : 'false' },
  });
  return data;
}

export async function fetchSales(params: QueryParams & { hidden?: boolean }): Promise<TradeItem[]> {
  const { data } = await api.get('/analytics/sales', {
    params: { ...params, hidden: params.hidden ? 'true' : 'false' },
  });
  return data;
}

export async function fetchInventory(params: { platform?: string }): Promise<TradeItem[]> {
  const { data } = await api.get('/analytics/inventory', { params });
  return data;
}

export async function toggleTradeHidden(tradeId: string): Promise<{ id: string; hidden: boolean }> {
  const { data } = await api.post(`/analytics/trades/${tradeId}/toggle-hide`);
  return data;
}

export async function bulkSetHidden(ids: string[], hidden: boolean): Promise<{ updated: number; hidden: boolean }> {
  const { data } = await api.post('/analytics/trades/bulk-hide', { ids, hidden });
  return data;
}

export interface DashboardStats {
  onSaleCount: number;
  purchasesCount: number;
  purchasesTotal: number;
  salesCount: number;
  salesTotal: number;
  avgProfitPercent: number;
  matchedCount: number;
  totalProfit: number;
  fxRate: number | null;
  chart: { date: string; purchases: number; sales: number }[];
}

export async function fetchDashboardStats(params: QueryParams): Promise<DashboardStats> {
  const { data } = await api.get('/analytics/dashboard-stats', { params });
  return data;
}

export async function fetchProfit(params: QueryParams): Promise<ProfitEntry[]> {
  const { data } = await api.get('/analytics/profit', { params });
  return data;
}

export async function fetchSyncStatus(): Promise<SyncLog[]> {
  const { data } = await api.get('/analytics/sync-status');
  return data;
}

export async function triggerFullSync(): Promise<{ message: string; results: { csfloatStall: number; csfloatTrades: number; marketTrades: number; marketRate: number } }> {
  const { data } = await api.post('/analytics/sync/all');
  return data;
}

export async function triggerSync(source: string): Promise<{ message: string }> {
  const endpoints: Record<string, string> = {
    csfloat_stall: '/csfloat/sync/stall',
    csfloat_trades: '/csfloat/sync/trades',
    market_trades: '/market-csgo/sync/trades',
    market_rate: '/market-csgo/sync/rate',
  };
  const { data } = await api.post(endpoints[source] || '');
  return data;
}

export async function fetchThirdPartyItems(): Promise<TradeItem[]> {
  const { data } = await api.get('/analytics/third-party');
  return data;
}

export interface CreateManualItemDto {
  name: string;
  wear?: string;
  floatValue?: number;
  buyPrice: number;
  customSource: string;
  purchaseDate: string;
  tradeBanDate?: string;
  status: string;
}

export async function createManualItem(data: CreateManualItemDto): Promise<any> {
  const { data: res } = await api.post('/manual/items', data);
  return res;
}

export interface CreateManualSaleDto {
  itemId: string;
  sellPrice: number;
  customSource: string;
  saleDate: string;
}

export async function createManualSale(data: CreateManualSaleDto): Promise<any> {
  const { data: res } = await api.post('/manual/sales', data);
  return res;
}

export async function updateTrade(id: string, data: { price?: number; date?: string; customSource?: string }): Promise<any> {
  const { data: res } = await api.put(`/manual/trades/${id}`, data);
  return res;
}

export async function deleteTrade(id: string): Promise<any> {
  const { data: res } = await api.delete(`/manual/trades/${id}`);
  return res;
}

export async function deleteManualItem(id: string): Promise<any> {
  const { data: res } = await api.delete(`/manual/items/${id}`);
  return res;
}

export interface InSaleItem {
  id: string;
  name: string;
  itemName: string;
  wear: string | null;
  floatValue: number | null;
  price: number;
  referencePrice: number | null;
  basePrice: number | null;
  quantity: number | null;
  watchers: number;
  createdAt: string;
  imageUrl: string | null;
  isStattrak: boolean;
  isSouvenir: boolean;
  type: string;
  rarity: string | null;
  collection: string | null;
  stickers: { name: string; iconUrl: string }[];
}

export async function fetchInSale(): Promise<InSaleItem[]> {
  const { data } = await api.get('/analytics/insale');
  return data;
}

export interface MarketInSaleItem {
  id: string;
  name: string;
  itemName: string;
  wear: string | null;
  floatValue: number | null;
  price: number;
  currency: string;
  createdAt: string;
  imageUrl: string | null;
  isStattrak: boolean;
  isSouvenir: boolean;
}

export async function fetchMarketInSale(): Promise<MarketInSaleItem[]> {
  const { data } = await api.get('/analytics/market-insale');
  return data;
}

export interface PricempireItem {
  id: number;
  name: string;
  image: string;
  price: {
    csfloat?: number;
    marketcsgo?: number;
    [key: string]: number | undefined;
  };
  profit?: number;
  roi?: number;
  trend?: number; // Simplified trend
}

export async function fetchPricempireComparison(): Promise<PricempireItem[]> {
  const { data } = await api.get('/pricempire/comparison');
  return data;
}

export default api;

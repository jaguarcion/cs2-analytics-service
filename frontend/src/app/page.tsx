'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowDownUp,
  RefreshCw,
  LogOut,
  BarChart3,
  Plus,
  Coins,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import PeriodSelector from '@/components/PeriodSelector';
import PlatformSelector from '@/components/PlatformSelector';
import TradesTable from '@/components/TradesTable';
import ProfitTable from '@/components/ProfitTable';
import LoginForm from '@/components/LoginForm';
import AddItemModal from '@/components/AddItemModal';
import AddSaleModal from '@/components/AddSaleModal';
import {
  fetchSummary,
  fetchPurchases,
  fetchSales,
  fetchProfit,
  toggleTradeHidden,
  bulkSetHidden,
  fetchInventory,
  fetchThirdPartyItems,
  triggerFullSync,
  type AnalyticsSummary,
  type TradeItem,
  type ProfitEntry,
  type Period,
  type Platform,
} from '@/lib/api';
import { formatUSD, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isAuthenticated, removeToken } from '@/lib/auth';

type Tab = 'overview' | 'csfloat_buy' | 'csfloat_sell' | 'market_sell' | 'inventory' | 'hidden' | 'third_party';

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={() => { removeToken(); setAuthed(false); }} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [platform, setPlatform] = useState<Platform>('ALL');
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [purchases, setPurchases] = useState<TradeItem[]>([]);
  const [sales, setSales] = useState<TradeItem[]>([]);
  const [profitEntries, setProfitEntries] = useState<ProfitEntry[]>([]);
  const [hiddenPurchases, setHiddenPurchases] = useState<TradeItem[]>([]);
  const [hiddenSales, setHiddenSales] = useState<TradeItem[]>([]);
  const [inventory, setInventory] = useState<TradeItem[]>([]);
  const [thirdPartyItems, setThirdPartyItems] = useState<TradeItem[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period, platform };
      const [summaryData, purchasesData, salesData, profitData, hiddenBuys, hiddenSells, inventoryData, thirdPartyData] =
        await Promise.all([
          fetchSummary(params),
          fetchPurchases(params),
          fetchSales(params),
          fetchProfit(params),
          fetchPurchases({ ...params, hidden: true }),
          fetchSales({ ...params, hidden: true }),
          fetchInventory({ platform }),
          fetchThirdPartyItems(),
        ]);
      setSummary(summaryData);
      setPurchases(purchasesData);
      setSales(salesData);
      setProfitEntries(profitData);
      setHiddenPurchases(hiddenBuys);
      setHiddenSales(hiddenSells);
      setInventory(inventoryData);
      setThirdPartyItems(thirdPartyData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [period, platform]);

  const handleFullSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await triggerFullSync();
      // Reload data after sync completes
      await loadData();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleHide = useCallback(async (tradeId: string) => {
    try {
      await toggleTradeHidden(tradeId);
      loadData();
    } catch (error) {
      console.error('Failed to toggle hide:', error);
    }
  }, [loadData]);

  const handleBulkHide = useCallback(async (ids: string[], hidden: boolean) => {
    try {
      await bulkSetHidden(ids, hidden);
      loadData();
    } catch (error) {
      console.error('Failed to bulk hide:', error);
    }
  }, [loadData]);

  // Filter trades by platform
  const csfloatBuys = purchases.filter((t) => t.platformSource === 'CSFLOAT');
  const csfloatSells = sales.filter((t) => t.platformSource === 'CSFLOAT');
  const marketSells = sales.filter((t) => t.platformSource === 'MARKET_CSGO');
  const hiddenAll = [...hiddenPurchases, ...hiddenSales];

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'overview', label: 'Обзор', count: profitEntries.length },
    { value: 'csfloat_buy', label: 'CSFloat Buy', count: csfloatBuys.length },
    { value: 'csfloat_sell', label: 'CSFloat Sell', count: csfloatSells.length },
    { value: 'market_sell', label: 'Market Sell', count: marketSells.length },
    { value: 'third_party', label: 'Трейд-бан', count: thirdPartyItems.length },
    { value: 'inventory', label: 'Инвентарь', count: inventory.length },
    { value: 'hidden', label: 'Скрытые', count: hiddenAll.length },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent-blue/10 p-2">
                <TrendingUp className="h-6 w-6 text-accent-blue" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-dark-50">
                  CS2 Analytics
                </h1>
                <p className="text-xs text-dark-500">
                  CSFloat + Market
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlatformSelector value={platform} onChange={setPlatform} />
              <PeriodSelector value={period} onChange={setPeriod} />
              <button
                onClick={() => setIsAddItemOpen(true)}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-accent-green"
                title="Добавить предмет"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={handleFullSync}
                disabled={loading || isSyncing}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('h-4 w-4', (loading || isSyncing) && 'animate-spin')}
                />
              </button>
              <button
                onClick={() => router.push('/stats')}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-accent-blue"
                title="Статистика"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={onLogout}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-accent-red"
                title="Выйти"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Inventory Value"
            value={summary ? formatUSD(summary.inventoryValue) : '—'}
            subtitle={summary ? `${summary.inventoryCount} предметов` : ''}
            icon={<Package className="h-5 w-5" />}
          />
          <StatCard
            title="Purchases"
            value={summary ? formatUSD(summary.totalPurchases) : '—'}
            subtitle={summary ? `${summary.purchasesCount} покупок` : ''}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <StatCard
            title="Sales"
            value={summary ? formatUSD(summary.totalSales) : '—'}
            subtitle={summary ? `${summary.salesCount} продаж` : ''}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Profit"
            value={summary ? formatUSD(summary.totalProfit) : '—'}
            subtitle={
              summary ? formatPercent(summary.profitPercent) : ''
            }
            icon={<TrendingUp className="h-5 w-5" />}
            trend={
              summary
                ? summary.totalProfit >= 0
                  ? 'up'
                  : 'down'
                : undefined
            }
          />
          <StatCard
            title="Курс USDT→RUB"
            value={
              summary?.fxRate
                ? `${summary.fxRate.rate.toFixed(2)} ₽`
                : '—'
            }
            subtitle={
              summary?.fxRate
                ? `Обновлён: ${new Date(summary.fxRate.fetchedAt).toLocaleTimeString('ru-RU')}`
                : ''
            }
            icon={<ArrowDownUp className="h-5 w-5" />}
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-dark-800 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap px-3 py-2 text-xs font-medium transition-all border-b-2',
                tab === t.value
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-dark-500 hover:text-dark-300',
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  tab === t.value
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'bg-dark-700 text-dark-400',
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-dark-500" />
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-dark-100">
                      Сматченные сделки (Profit)
                    </h2>
                    <button
                      onClick={() => setIsAddSaleOpen(true)}
                      className="flex items-center gap-2 rounded-lg bg-accent-green/10 px-3 py-1.5 text-xs font-medium text-accent-green hover:bg-accent-green/20 transition-colors"
                    >
                      <Coins className="h-4 w-4" />
                      Добавить продажу
                    </button>
                  </div>
                  <ProfitTable entries={profitEntries} onReload={loadData} />
                </div>
              )}
              {tab === 'csfloat_buy' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Покупки — CSFloat
                  </h2>
                  <TradesTable trades={csfloatBuys} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} />
                </div>
              )}
              {tab === 'csfloat_sell' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Продажи — CSFloat
                  </h2>
                  <TradesTable trades={csfloatSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} />
                </div>
              )}
              {tab === 'market_sell' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Продажи — Market.CSGO
                  </h2>
                  <TradesTable trades={marketSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} />
                </div>
              )}
              {tab === 'third_party' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Трейд-бан (ожидание)
                  </h2>
                  <TradesTable trades={thirdPartyItems} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} />
                </div>
              )}
              {tab === 'inventory' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Инвентарь
                  </h2>
                  <TradesTable trades={inventory} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} />
                </div>
              )}
              {tab === 'hidden' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Скрытые предметы
                  </h2>
                  <TradesTable trades={hiddenAll} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} isHiddenView onReload={loadData} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AddItemModal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} onSuccess={loadData} />
      <AddSaleModal isOpen={isAddSaleOpen} onClose={() => setIsAddSaleOpen(false)} onSuccess={loadData} items={[...inventory, ...thirdPartyItems]} />
    </div>
  );
}

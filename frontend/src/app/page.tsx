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
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import PeriodSelector from '@/components/PeriodSelector';
import PlatformSelector from '@/components/PlatformSelector';
import TradesTable from '@/components/TradesTable';
import ProfitTable from '@/components/ProfitTable';
import LoginForm from '@/components/LoginForm';
import {
  fetchSummary,
  fetchPurchases,
  fetchSales,
  fetchProfit,
  toggleTradeHidden,
  bulkSetHidden,
  type AnalyticsSummary,
  type TradeItem,
  type ProfitEntry,
  type Period,
  type Platform,
} from '@/lib/api';
import { formatUSD, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isAuthenticated, removeToken } from '@/lib/auth';

type Tab = 'overview' | 'csfloat_buy' | 'csfloat_sell' | 'market_buy' | 'market_sell' | 'hidden';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period, platform };
      const [summaryData, purchasesData, salesData, profitData, hiddenBuys, hiddenSells] =
        await Promise.all([
          fetchSummary(params),
          fetchPurchases(params),
          fetchSales(params),
          fetchProfit(params),
          fetchPurchases({ ...params, hidden: true }),
          fetchSales({ ...params, hidden: true }),
        ]);
      setSummary(summaryData);
      setPurchases(purchasesData);
      setSales(salesData);
      setProfitEntries(profitData);
      setHiddenPurchases(hiddenBuys);
      setHiddenSales(hiddenSells);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [period, platform]);

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
    { value: 'overview', label: 'Общая стата', count: profitEntries.length },
    { value: 'csfloat_buy', label: 'CSFloat — Покупки', count: csfloatBuys.length },
    { value: 'csfloat_sell', label: 'CSFloat — Продажи', count: csfloatSells.length },
    { value: 'market_sell', label: 'Market.CSGO — Продажи', count: marketSells.length },
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
                  CS2 Skin Analytics
                </h1>
                <p className="text-xs text-dark-500">
                  CSFloat + Market.CSGO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlatformSelector value={platform} onChange={setPlatform} />
              <PeriodSelector value={period} onChange={setPeriod} />
              <button
                onClick={loadData}
                disabled={loading}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
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
        <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-dark-800">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all border-b-2',
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
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Сматченные сделки (Profit)
                  </h2>
                  <ProfitTable entries={profitEntries} />
                </div>
              )}
              {tab === 'csfloat_buy' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Покупки — CSFloat
                  </h2>
                  <TradesTable trades={csfloatBuys} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} />
                </div>
              )}
              {tab === 'csfloat_sell' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Продажи — CSFloat
                  </h2>
                  <TradesTable trades={csfloatSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} />
                </div>
              )}
              {tab === 'market_sell' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Продажи — Market.CSGO
                  </h2>
                  <TradesTable trades={marketSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} />
                </div>
              )}
              {tab === 'hidden' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-dark-100">
                    Скрытые предметы
                  </h2>
                  <TradesTable trades={hiddenAll} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} isHiddenView />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

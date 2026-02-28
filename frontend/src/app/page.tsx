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

import TradesTable from '@/components/TradesTable';
import ProfitTable from '@/components/ProfitTable';
import InSaleTable from '@/components/InSaleTable';

import LoginForm from '@/components/LoginForm';
import AddItemModal from '@/components/AddItemModal';
import AddSaleModal from '@/components/AddSaleModal';
import EditItemModal from '@/components/EditItemModal';
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
  fetchInSale,
  type AnalyticsSummary,
  type TradeItem,
  type ProfitEntry,
  type InSaleItem,

  type Period,
  type Platform,
} from '@/lib/api';
import { formatUSD, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isAuthenticated, removeToken } from '@/lib/auth';

type TabGroup = 'overview' | 'csfloat_buy' | 'sells' | 'insale' | 'other';
type SubTab = string;

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
  const [platform] = useState<Platform>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [group, setGroup] = useState<TabGroup>('overview');
  const [subTab, setSubTab] = useState<SubTab>('');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [purchases, setPurchases] = useState<TradeItem[]>([]);
  const [sales, setSales] = useState<TradeItem[]>([]);
  const [profitEntries, setProfitEntries] = useState<ProfitEntry[]>([]);
  const [hiddenPurchases, setHiddenPurchases] = useState<TradeItem[]>([]);
  const [hiddenSales, setHiddenSales] = useState<TradeItem[]>([]);
  const [inventory, setInventory] = useState<TradeItem[]>([]);
  const [thirdPartyItems, setThirdPartyItems] = useState<TradeItem[]>([]);
  const [inSaleItems, setInSaleItems] = useState<InSaleItem[]>([]);


  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = period === 'custom' && customFrom && customTo
        ? { from: customFrom, to: customTo, platform }
        : { period, platform };
      const [summaryData, purchasesData, salesData, profitData, hiddenBuys, hiddenSells, inventoryData, thirdPartyData, inSaleData] =
        await Promise.all([
          fetchSummary(params),
          fetchPurchases(params),
          fetchSales(params),
          fetchProfit(params),
          fetchPurchases({ ...params, hidden: true }),
          fetchSales({ ...params, hidden: true }),
          fetchInventory({ platform }),
          fetchThirdPartyItems(),
          fetchInSale(),
        ]);
      setSummary(summaryData);
      setPurchases(purchasesData);
      setSales(salesData);
      setProfitEntries(profitData);
      setHiddenPurchases(hiddenBuys);
      setHiddenSales(hiddenSells);
      setInventory(inventoryData);
      setThirdPartyItems(thirdPartyData);
      setInSaleItems(inSaleData);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [period, platform, customFrom, customTo]);

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

  const handleEditItem = useCallback((trade: TradeItem) => {
    setEditingTrade(trade);
    setIsEditItemOpen(true);
  }, []);

  // Filter trades by platform
  const csfloatBuys = purchases.filter((t) => t.platformSource === 'CSFLOAT');
  const csfloatSells = sales.filter((t) => t.platformSource === 'CSFLOAT' && (t.status === 'COMPLETED' || t.status === 'TRADE_HOLD'));
  const marketSells = sales.filter((t) => t.platformSource === 'MARKET_CSGO' && (t.status === 'COMPLETED' || t.status === 'TRADE_HOLD'));
  const hiddenAll = [...hiddenPurchases, ...hiddenSales];

  const groups: { value: TabGroup; label: string }[] = [
    { value: 'overview', label: 'Обзор' },
    { value: 'csfloat_buy', label: 'CSFloat Buy' },
    { value: 'sells', label: 'CSFloat Sell / Market Sell' },
    { value: 'insale', label: 'CSFloat InSale / Market.CSGO InSale' },
    { value: 'other', label: 'Трейд-бан / Инвентарь / Скрытые' },
  ];

  const handleGroupChange = (g: TabGroup) => {
    setGroup(g);
    if (g === 'sells') setSubTab('csfloat_sell');
    else if (g === 'insale') setSubTab('csfloat_insale');
    else if (g === 'other') setSubTab('third_party');
    else setSubTab('');
  };

  // Init default sub-tab on first render
  // (group starts as 'overview', subTab starts as '')

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
              <PeriodSelector
                value={period}
                onChange={(p) => { setPeriod(p); setCustomFrom(''); setCustomTo(''); }}
                onCustomRange={(from, to) => { setCustomFrom(from); setCustomTo(to); setPeriod('custom'); }}
                customFrom={customFrom}
                customTo={customTo}
              />
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

        {/* Navigation — Grouped Segmented Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* 1. Overview (Standalone) */}
          <button
            onClick={() => handleGroupChange('overview')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              group === 'overview'
                ? 'bg-accent-blue text-white shadow-sm'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200',
            )}
          >
            Обзор
          </button>

          {/* 2. CSFloat Buy (Standalone) */}
          <button
            onClick={() => handleGroupChange('csfloat_buy')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              group === 'csfloat_buy'
                ? 'bg-accent-blue text-white shadow-sm'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200',
            )}
          >
            CSFloat Buy
          </button>

          {/* 3. Sells Group (Segmented) */}
          <div className="flex items-center gap-1 rounded-lg bg-dark-800 p-1">
            {[
              { value: 'csfloat_sell', label: 'CSFloat Sell', count: csfloatSells.length },
              { value: 'market_sell', label: 'Market Sell', count: marketSells.length },
            ].map((st) => {
              const isActive = group === 'sells' && subTab === st.value;
              return (
                <button
                  key={st.value}
                  onClick={() => {
                    setGroup('sells');
                    setSubTab(st.value);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-dark-400 hover:text-dark-200',
                  )}
                >
                  {st.label}
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-dark-700 text-dark-400',
                  )}>{st.count}</span>
                </button>
              );
            })}
          </div>

          {/* 4. InSale (Standalone — only CSFloat InSale left) */}
          <button
            onClick={() => { setGroup('insale'); setSubTab('csfloat_insale'); }}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              group === 'insale'
                ? 'bg-accent-blue text-white shadow-sm'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200',
            )}
          >
            CSFloat InSale
            <span className={cn(
              'ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
              group === 'insale'
                ? 'bg-white/20 text-white'
                : 'bg-dark-700 text-dark-400',
            )}>{inSaleItems.length}</span>
          </button>

          {/* 5. Other Group (Segmented) */}
          <div className="flex items-center gap-1 rounded-lg bg-dark-800 p-1">
            {[
              { value: 'third_party', label: 'Трейд-бан', count: thirdPartyItems.length },
              { value: 'inventory', label: 'Инвентарь', count: inventory.length },
              { value: 'hidden', label: 'Скрытые', count: hiddenAll.length },
            ].map((st) => {
              const isActive = group === 'other' && subTab === st.value;
              return (
                <button
                  key={st.value}
                  onClick={() => {
                    setGroup('other');
                    setSubTab(st.value);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-dark-400 hover:text-dark-200',
                  )}
                >
                  {st.label}
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-dark-700 text-dark-400',
                  )}>{st.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-dark-500" />
            </div>
          ) : (
            <>

              {/* Tab content */}
              {group === 'overview' && (
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
              {group === 'csfloat_buy' && (
                <div>
                  <TradesTable trades={csfloatBuys} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} onEdit={handleEditItem} defaultSortKey="tradeban" defaultSortDir="asc" />
                </div>
              )}
              {group === 'sells' && subTab === 'csfloat_sell' && (
                <div>
                  <TradesTable trades={csfloatSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} defaultSortKey="tradeban" defaultSortDir="asc" />
                </div>
              )}
              {group === 'sells' && subTab === 'market_sell' && (
                <div>
                  <TradesTable trades={marketSells} type="SELL" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} defaultSortKey="tradeban" defaultSortDir="asc" />
                </div>
              )}
              {group === 'insale' && subTab === 'csfloat_insale' && (
                <div>
                  <InSaleTable items={inSaleItems} />
                </div>
              )}

              {group === 'other' && subTab === 'third_party' && (
                <div>
                  <TradesTable trades={thirdPartyItems} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} onEdit={handleEditItem} defaultSortKey="tradeban" defaultSortDir="asc" />
                </div>
              )}
              {group === 'other' && subTab === 'inventory' && (
                <div>
                  <TradesTable trades={inventory} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} onReload={loadData} onEdit={handleEditItem} />
                </div>
              )}
              {group === 'other' && subTab === 'hidden' && (
                <div>
                  <TradesTable trades={hiddenAll} type="BUY" fxRate={summary?.fxRate?.rate} onToggleHide={handleToggleHide} onBulkHide={handleBulkHide} isHiddenView onReload={loadData} onEdit={handleEditItem} defaultSortKey="tradeban" defaultSortDir="asc" />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AddItemModal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} onSuccess={loadData} />
      <AddSaleModal isOpen={isAddSaleOpen} onClose={() => setIsAddSaleOpen(false)} onSuccess={loadData} items={[...inventory, ...thirdPartyItems]} />
      <EditItemModal isOpen={isEditItemOpen} onClose={() => setIsEditItemOpen(false)} onSuccess={loadData} trade={editingTrade} />
    </div>
  );
}

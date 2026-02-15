'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  BarChart3,
} from 'lucide-react';
import PeriodSelector from '@/components/PeriodSelector';
import {
  fetchDashboardStats,
  type DashboardStats,
  type Period,
} from '@/lib/api';
import { formatUSD, formatPercent } from '@/lib/utils';
import { isAuthenticated } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export default function StatsPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return <StatsContent />;
}

function StatsContent() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardStats({ period });
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const maxChartValue = stats
    ? Math.max(...stats.chart.map((d) => Math.max(d.purchases, d.sales)), 1)
    : 1;

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-dark-800 bg-dark-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-dark-50">Статистика</h1>
                <p className="text-xs text-dark-500">Обзор торговли</p>
              </div>
            </div>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading || !stats ? (
          <div className="flex items-center justify-center py-24">
            <BarChart3 className="h-10 w-10 animate-pulse text-dark-500" />
          </div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* On Sale */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Доступно к продаже</span>
                  <div className="rounded-lg bg-accent-blue/10 p-2">
                    <Package className="h-4 w-4 text-accent-blue" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold text-dark-50">
                  {stats.onSaleCount}
                </p>
                <p className="mt-1 text-xs text-dark-500">вещей на площадках</p>
              </div>

              {/* Purchases */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Покупки за период</span>
                  <div className="rounded-lg bg-accent-orange/10 p-2">
                    <ShoppingCart className="h-4 w-4 text-accent-orange" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold text-dark-50">
                  {formatUSD(stats.purchasesTotal)}
                </p>
                <p className="mt-1 text-xs text-dark-500">
                  {stats.purchasesCount} сделок
                </p>
              </div>

              {/* Sales */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Продажи за период</span>
                  <div className="rounded-lg bg-accent-green/10 p-2">
                    <DollarSign className="h-4 w-4 text-accent-green" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold text-dark-50">
                  {formatUSD(stats.salesTotal)}
                </p>
                <p className="mt-1 text-xs text-dark-500">
                  {stats.salesCount} сделок
                </p>
              </div>

              {/* Avg Profit % */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Средний % профита</span>
                  <div className={`rounded-lg p-2 ${stats.avgProfitPercent >= 0 ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
                    <TrendingUp className={`h-4 w-4 ${stats.avgProfitPercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`} />
                  </div>
                </div>
                <p className={`mt-2 text-3xl font-bold ${stats.avgProfitPercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatPercent(stats.avgProfitPercent)}
                </p>
                <p className="mt-1 text-xs text-dark-500">
                  {stats.matchedCount} сматченных сделок
                </p>
              </div>

              {/* Total Profit */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Профит за период</span>
                  <div className={`rounded-lg p-2 ${stats.totalProfit >= 0 ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
                    <DollarSign className={`h-4 w-4 ${stats.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`} />
                  </div>
                </div>
                <p className={`mt-2 text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatUSD(stats.totalProfit)}
                </p>
                <p className="mt-1 text-xs text-dark-500">чистая прибыль</p>
              </div>

              {/* FX Rate */}
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Курс USDT→RUB</span>
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold text-dark-50">
                  {stats.fxRate ? `${stats.fxRate.toFixed(2)} ₽` : '—'}
                </p>
                <p className="mt-1 text-xs text-dark-500">с комиссией 3%</p>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark-100">
                  Покупки и продажи по дням
                </h2>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-accent-blue" />
                    <span className="text-dark-400">Покупки</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-accent-green" />
                    <span className="text-dark-400">Продажи</span>
                  </div>
                </div>
              </div>

              {stats.chart.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-dark-500">
                  Нет данных за выбранный период
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1" style={{ minWidth: stats.chart.length * 48, height: 220 }}>
                    {stats.chart.map((day) => {
                      const pHeight = maxChartValue > 0 ? (day.purchases / maxChartValue) * 180 : 0;
                      const sHeight = maxChartValue > 0 ? (day.sales / maxChartValue) * 180 : 0;
                      const hasBoth = day.purchases > 0 || day.sales > 0;

                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 40 }}>
                          <div className="flex items-end gap-0.5" style={{ height: 180 }}>
                            <div
                              className="w-3 rounded-t bg-accent-blue transition-all hover:opacity-80"
                              style={{ height: Math.max(pHeight, hasBoth ? 2 : 0) }}
                              title={`Покупки: ${formatUSD(day.purchases)}`}
                            />
                            <div
                              className="w-3 rounded-t bg-accent-green transition-all hover:opacity-80"
                              style={{ height: Math.max(sHeight, hasBoth ? 2 : 0) }}
                              title={`Продажи: ${formatUSD(day.sales)}`}
                            />
                          </div>
                          <span className="text-[9px] text-dark-500 whitespace-nowrap">
                            {formatShortDate(day.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

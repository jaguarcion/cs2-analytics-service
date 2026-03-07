'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  BarChart3,
  BarChart as BarChartIcon,
  Activity,
  CalendarDays,
  ListPlus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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

const CustomTooltip = ({ active, payload, label, dataView }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-dark-700 bg-dark-800 p-3 shadow-xl">
        <p className="mb-2 text-sm font-medium text-dark-200">
          {formatShortDate(label)}
          {dataView === 'cumulative' && <span className="ml-1 text-xs text-dark-500">(Накопительно)</span>}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-dark-400">
              {entry.name === 'purchases' ? 'Покупки' : 'Продажи'}:
            </span>
            <span className="font-semibold text-dark-50">
              {formatUSD(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Chart Controls State
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [dataView, setDataView] = useState<'daily' | 'cumulative'>('daily');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = period === 'custom' && customFrom && customTo
        ? { period, from: customFrom, to: customTo }
        : { period };
      const data = await fetchDashboardStats(params);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const processedChartData = useMemo(() => {
    if (!stats) return [];

    if (dataView === 'daily') {
      return stats.chart;
    }

    // Cumulative calculation
    let currentPurchases = 0;
    let currentSales = 0;

    return stats.chart.map(day => {
      currentPurchases += day.purchases;
      currentSales += day.sales;
      return {
        ...day,
        purchases: currentPurchases,
        sales: currentSales
      };
    });
  }, [stats, dataView]);

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
            <PeriodSelector
              value={period}
              onChange={(p) => { setPeriod(p); setCustomFrom(''); setCustomTo(''); }}
              onCustomRange={(from, to) => { setCustomFrom(from); setCustomTo(to); setPeriod('custom'); }}
              customFrom={customFrom}
              customTo={customTo}
            />
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
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-dark-100">
                    Динамика торговли
                  </h2>
                  <div className="mt-2 flex items-center gap-4 text-xs">
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

                {/* Chart Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-dark-700 bg-dark-800/50 p-1">
                    <button
                      onClick={() => setDataView('daily')}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${dataView === 'daily'
                        ? 'bg-dark-700 text-dark-50'
                        : 'text-dark-400 hover:text-dark-200'
                        }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">По дням</span>
                    </button>
                    <button
                      onClick={() => setDataView('cumulative')}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${dataView === 'cumulative'
                        ? 'bg-dark-700 text-dark-50'
                        : 'text-dark-400 hover:text-dark-200'
                        }`}
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Накопительно</span>
                    </button>
                  </div>

                  <div className="flex items-center rounded-lg border border-dark-700 bg-dark-800/50 p-1">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`rounded-md p-1.5 transition-colors ${chartType === 'bar'
                        ? 'bg-dark-700 text-dark-50'
                        : 'text-dark-400 hover:text-dark-200'
                        }`}
                      title="Столбцы"
                    >
                      <BarChartIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setChartType('area')}
                      className={`rounded-md p-1.5 transition-colors ${chartType === 'area'
                        ? 'bg-dark-700 text-dark-50'
                        : 'text-dark-400 hover:text-dark-200'
                        }`}
                      title="Пульс (Линии)"
                    >
                      <Activity className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {processedChartData.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-dark-500">
                  Нет данных за выбранный период
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart
                        data={processedChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#334155"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(value) => `${value}`}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip
                          content={<CustomTooltip dataView={dataView} />}
                          cursor={{ fill: '#1e293b', opacity: 0.4 }}
                        />
                        <Bar
                          dataKey="purchases"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                        <Bar
                          dataKey="sales"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart
                        data={processedChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#334155"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(value) => `${value}`}
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip
                          content={<CustomTooltip dataView={dataView} />}
                          cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="purchases"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPurchases)"
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorSales)"
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}



'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchPricempireComparison, type PricempireItem } from '@/lib/api';
import { formatUSD, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function MarketPage() {
  const router = useRouter();
  const [items, setItems] = useState<PricempireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPricempireComparison();
      setItems(data);
    } catch (err) {
      console.error('Failed to load market data', err);
      setError('Не удалось загрузить данные с Pricempire. Возможно, требуется настройка прокси/cookies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-dark-950 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="rounded-lg bg-dark-800 p-2 text-dark-400 hover:bg-dark-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Рынок (Pricempire)</h1>
              <p className="text-sm text-dark-400">Сравнение цен CSFloat → Market.CSGO</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Обновить
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-900 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-dark-700 bg-dark-800/50 text-xs font-medium uppercase text-dark-400">
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 text-center">Price Comparison</th>
                    <th className="px-6 py-4 text-center">Trend</th>
                    <th className="px-6 py-4 text-right">Profit</th>
                    <th className="px-6 py-4 text-right">ROI</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-12 w-48 rounded bg-dark-700"></div></td>
                        <td className="px-6 py-4"><div className="mx-auto h-8 w-32 rounded bg-dark-700"></div></td>
                        <td className="px-6 py-4"><div className="mx-auto h-8 w-24 rounded bg-dark-700"></div></td>
                        <td className="px-6 py-4"><div className="ml-auto h-6 w-16 rounded bg-dark-700"></div></td>
                        <td className="px-6 py-4"><div className="ml-auto h-6 w-12 rounded bg-dark-700"></div></td>
                        <td className="px-6 py-4"><div className="h-8 w-24 rounded bg-dark-700"></div></td>
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-dark-400">
                        Нет данных
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="group hover:bg-dark-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-dark-800">
                              <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                            </div>
                            <div className="font-medium text-white group-hover:text-accent-blue transition-colors">
                              {item.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg bg-dark-800 px-3 py-1.5 border border-dark-700">
                              <span className="text-white font-medium">{formatUSD((item.price.csfloat || 0) / 100)}</span>
                              <img src="/csfloat-icon.png" alt="F" className="h-4 w-4 opacity-50" onError={(e) => e.currentTarget.style.display = 'none'} />
                              <span className="text-[10px] text-dark-400">F</span>
                            </div>
                            <span className="text-dark-500">→</span>
                            <div className="flex items-center gap-2 rounded-lg bg-dark-800 px-3 py-1.5 border border-dark-700">
                              <img src="/market-icon.png" alt="M" className="h-4 w-4 opacity-50" onError={(e) => e.currentTarget.style.display = 'none'} />
                              <span className="text-[10px] text-dark-400">M</span>
                              <span className="text-white font-medium">{formatUSD((item.price.marketcsgo || 0) / 100)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {/* Simulated trend */}
                          <div className="flex justify-center">
                            <TrendingUp className="h-5 w-5 text-accent-blue opacity-50" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-accent-green">
                            +{formatUSD((item.profit || 0) / 100)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-block rounded-md bg-accent-green/10 px-2 py-1 text-xs font-bold text-accent-green">
                            {((item.roi || 0)).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a 
                            href={`https://pricempire.com/item/${item.name}`} // Fallback link
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-accent-green px-4 py-2 text-xs font-bold text-white hover:bg-accent-green/90 transition-colors"
                          >
                            Check Offer
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import type { TradeItem } from '@/lib/api';
import { formatUSD, formatRUB, formatDate, platformLabel } from '@/lib/utils';

const PAGE_SIZE = 30;
const TRADE_BAN_DAYS = 7;

function getTradeHoldRemaining(tradedAt: string): string | null {
  const tradeDate = new Date(tradedAt);
  const banEnd = new Date(tradeDate.getTime() + TRADE_BAN_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = banEnd.getTime() - now.getTime();

  if (diffMs <= 0) return 'Истёк';

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `~${days}д ${hours}ч`;
  return `~${hours}ч`;
}

function getStatusLabel(status: string, type: 'BUY' | 'SELL', platform: string): string {
  if (platform === 'MARKET_CSGO') {
    switch (status) {
      case 'COMPLETED': return 'Продано';
      case 'TRADE_HOLD': return 'Передача';
      case 'ACCEPTED': return 'Забрать';
      case 'PENDING': return 'В продаже';
      case 'CANCELLED': return 'Отменён';
      default: return status;
    }
  }

  switch (status) {
    case 'COMPLETED': return type === 'SELL' ? 'Продано' : 'Куплено';
    case 'TRADE_HOLD': return 'Трейд-бан';
    case 'ACCEPTED': return 'В процессе';
    case 'PENDING': return type === 'SELL' ? 'В продаже' : 'Ожидание';
    case 'CANCELLED': return 'Отменён';
    default: return status;
  }
}

function showTradeBan(trade: TradeItem): boolean {
  // Show trade ban countdown for:
  // - TRADE_HOLD status (item being transferred)
  // - COMPLETED sells where ban hasn't expired yet (sold date + 7 days)
  if (trade.status === 'TRADE_HOLD') return true;
  if (trade.status === 'COMPLETED' && trade.tradedAt) {
    const remaining = getTradeHoldRemaining(trade.tradedAt);
    return remaining !== null && remaining !== 'Истёк';
  }
  return false;
}

interface TradesTableProps {
  trades: TradeItem[];
  type: 'BUY' | 'SELL';
  fxRate?: number | null;
  onToggleHide?: (tradeId: string) => void;
  isHiddenView?: boolean;
}

export default function TradesTable({ trades, type, fxRate, onToggleHide, isHiddenView }: TradesTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset visible count when trades change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [trades]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, trades.length));
  }, [trades.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < trades.length) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, trades.length, loadMore]);

  const visibleTrades = trades.slice(0, visibleCount);
  const hasMore = visibleCount < trades.length;

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-dark-500">
        Нет данных за выбранный период
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-700/50 text-left text-dark-400">
            <th className="pb-3 pr-4 font-medium">Предмет</th>
            <th className="pb-3 pr-4 font-medium">Wear</th>
            <th className="pb-3 pr-4 font-medium">Float</th>
            <th className="pb-3 pr-4 font-medium">
              {type === 'BUY' ? 'Цена покупки' : 'Цена продажи'}
            </th>
            <th className="pb-3 pr-4 font-medium">Платформа</th>
            <th className="pb-3 pr-4 font-medium">Статус</th>
            <th className="pb-3 pr-4 font-medium">Дата</th>
            {onToggleHide && <th className="pb-3 w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-800">
          {visibleTrades.map((trade) => {
            const i = trade.item;
            return (
              <tr
                key={trade.id}
                className="text-dark-200 transition-colors hover:bg-dark-800/50"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {i?.imageUrl ? (
                      <img
                        src={
                          i.imageUrl.startsWith('http')
                            ? i.imageUrl
                            : `https://community.steamstatic.com/economy/image/${i.imageUrl}/96fx96f`
                        }
                        alt={i.name}
                        className="h-10 w-14 rounded object-contain bg-dark-700/50"
                      />
                    ) : (
                      <div className="flex h-10 w-14 items-center justify-center rounded bg-dark-700/50 text-dark-500 text-xs">
                        ?
                      </div>
                    )}
                    <span className="font-medium text-dark-50">
                      {i?.name || '—'}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-dark-400">
                  {i?.wear || '—'}
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-dark-400">
                  {i?.floatValue?.toFixed(8) || '—'}
                </td>
                <td className="py-3 pr-4 font-medium">
                  {(() => {
                    const price = type === 'BUY' ? (trade.buyPrice || 0) : (trade.sellPrice || 0);
                    if (trade.platformSource === 'MARKET_CSGO') {
                      const rubInt = Math.round(price);
                      const usdEquiv = fxRate && fxRate > 0 ? price / fxRate : null;
                      return (
                        <div>
                          <span>{rubInt.toLocaleString('ru-RU')} ₽</span>
                          {usdEquiv !== null && (
                            <span className="ml-1.5 text-xs text-dark-500">
                              ≈ {formatUSD(usdEquiv)}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return formatUSD(price);
                  })()}
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs font-medium text-dark-300">
                    {platformLabel(trade.platformSource)}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        trade.status === 'COMPLETED'
                          ? 'bg-accent-green/10 text-accent-green'
                          : trade.status === 'TRADE_HOLD'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : trade.status === 'ACCEPTED'
                              ? 'bg-blue-500/10 text-blue-400'
                              : trade.status === 'CANCELLED'
                                ? 'bg-accent-red/10 text-accent-red'
                                : 'bg-accent-orange/10 text-accent-orange'
                      }`}
                    >
                      {getStatusLabel(trade.status, type, trade.platformSource)}
                    </span>
                    {trade.tradedAt && showTradeBan(trade) && (
                      <span className="text-[10px] text-yellow-500/70">
                        {getTradeHoldRemaining(trade.tradedAt)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-dark-400">
                  {formatDate(trade.tradedAt)}
                </td>
                {onToggleHide && (
                  <td className="py-3">
                    <button
                      onClick={() => onToggleHide(trade.id)}
                      className="rounded p-1 text-dark-500 transition-colors hover:bg-dark-700 hover:text-dark-300"
                      title={isHiddenView ? 'Показать' : 'Скрыть'}
                    >
                      {isHiddenView ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Infinite scroll loader */}
      <div ref={loaderRef} className="py-4 text-center">
        {hasMore ? (
          <span className="text-xs text-dark-500">
            Показано {visibleCount} из {trades.length} — скролльте вниз
          </span>
        ) : trades.length > PAGE_SIZE ? (
          <span className="text-xs text-dark-500">
            Все {trades.length} записей загружены
          </span>
        ) : null}
      </div>
    </div>
  );
}

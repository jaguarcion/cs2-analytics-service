'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EyeOff, Eye, Search, X, ChevronDown, Check } from 'lucide-react';
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
  if (trade.status === 'TRADE_HOLD') return true;
  if (trade.status === 'COMPLETED' && trade.tradedAt) {
    const remaining = getTradeHoldRemaining(trade.tradedAt);
    return remaining !== null && remaining !== 'Истёк';
  }
  return false;
}

/** Extract item type prefix, e.g. "AK-47", "Glock-18", "Sticker", "★ Karambit" */
function getItemType(name: string): string {
  // Stickers, agents, patches, etc.
  for (const prefix of ['Sticker', 'Patch', 'Agent', 'Music Kit', 'Graffiti', 'Charm']) {
    if (name.startsWith(prefix)) return prefix;
  }
  // Weapon skins: "AK-47 | Redline" → "AK-47"
  const pipeIdx = name.indexOf(' | ');
  if (pipeIdx > 0) return name.slice(0, pipeIdx).trim();
  // Fallback
  return name.split(' ')[0] || 'Другое';
}

interface TradesTableProps {
  trades: TradeItem[];
  type: 'BUY' | 'SELL';
  fxRate?: number | null;
  onToggleHide?: (tradeId: string) => void;
  onBulkHide?: (ids: string[], hidden: boolean) => void;
  isHiddenView?: boolean;
}

export default function TradesTable({ trades, type, fxRate, onToggleHide, onBulkHide, isHiddenView }: TradesTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loaderRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build item type options from trades
  const itemTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of trades) {
      const tp = getItemType(t.item?.name || '');
      counts.set(tp, (counts.get(tp) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [trades]);

  // Filter trades by search + item type
  const filteredTrades = useMemo(() => {
    let result = trades;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.item?.name?.toLowerCase().includes(q));
    }
    if (itemTypeFilter !== 'all') {
      result = result.filter((t) => getItemType(t.item?.name || '') === itemTypeFilter);
    }
    return result;
  }, [trades, search, itemTypeFilter]);

  // Reset visible count & selection when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelectedIds(new Set());
  }, [trades, search, itemTypeFilter]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredTrades.length));
  }, [filteredTrades.length]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredTrades.length) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filteredTrades.length, loadMore]);

  const visibleTrades = filteredTrades.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrades.length;

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTrades.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTrades.map((t) => t.id)));
    }
  };

  const allSelected = filteredTrades.length > 0 && selectedIds.size === filteredTrades.length;
  const someSelected = selectedIds.size > 0;

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-dark-500">
        Нет данных за выбранный период
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar: search + filter + bulk actions */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full rounded-lg border border-dark-700 bg-dark-800 py-2 pl-9 pr-8 text-sm text-dark-100 placeholder-dark-500 outline-none focus:border-accent-blue/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-dark-500 hover:text-dark-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Item type filter */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-200 hover:border-dark-600"
          >
            <span className="max-w-[140px] truncate">
              {itemTypeFilter === 'all' ? 'Все типы' : itemTypeFilter}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-dark-500" />
          </button>
          {typeDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-dark-700 bg-dark-900 shadow-xl">
              <button
                onClick={() => { setItemTypeFilter('all'); setTypeDropdownOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-dark-700/50 ${
                  itemTypeFilter === 'all' ? 'text-accent-blue' : 'text-dark-200'
                }`}
              >
                <span>Все типы</span>
                <span className="text-xs text-dark-500">{trades.length}</span>
              </button>
              {itemTypes.map(({ label, count }) => (
                <button
                  key={label}
                  onClick={() => { setItemTypeFilter(label); setTypeDropdownOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-dark-700/50 ${
                    itemTypeFilter === label ? 'text-accent-blue' : 'text-dark-200'
                  }`}
                >
                  <span className="truncate pr-2">{label}</span>
                  <span className="text-xs text-dark-500">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter info */}
        {(search || itemTypeFilter !== 'all') && (
          <span className="text-xs text-dark-500">
            Найдено: {filteredTrades.length} из {trades.length}
          </span>
        )}

        {/* Bulk actions */}
        {someSelected && onBulkHide && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-dark-400">
              Выбрано: {selectedIds.size}
            </span>
            <button
              onClick={() => {
                onBulkHide(Array.from(selectedIds), !isHiddenView);
                setSelectedIds(new Set());
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isHiddenView
                  ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              {isHiddenView ? 'Показать выбранные' : 'Скрыть выбранные'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700/50 text-left text-dark-400">
              {onBulkHide && (
                <th className="pb-3 pr-2 w-8">
                  <button
                    onClick={toggleSelectAll}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      allSelected
                        ? 'border-accent-blue bg-accent-blue text-white'
                        : someSelected
                          ? 'border-accent-blue/50 bg-accent-blue/20'
                          : 'border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    {allSelected && <Check className="h-3 w-3" />}
                    {someSelected && !allSelected && <div className="h-1.5 w-1.5 rounded-sm bg-accent-blue" />}
                  </button>
                </th>
              )}
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
              const isChecked = selectedIds.has(trade.id);
              return (
                <tr
                  key={trade.id}
                  className={`text-dark-200 transition-colors hover:bg-dark-800/50 ${isChecked ? 'bg-accent-blue/5' : ''}`}
                >
                  {onBulkHide && (
                    <td className="py-3 pr-2">
                      <button
                        onClick={() => toggleSelect(trade.id)}
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'border-accent-blue bg-accent-blue text-white'
                            : 'border-dark-600 hover:border-dark-500'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </button>
                    </td>
                  )}
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
              Показано {visibleCount} из {filteredTrades.length} — скролльте вниз
            </span>
          ) : filteredTrades.length > PAGE_SIZE ? (
            <span className="text-xs text-dark-500">
              Все {filteredTrades.length} записей загружены
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

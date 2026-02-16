'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EyeOff, Eye, Search, X, ChevronDown, Check, ArrowUpDown, ArrowUp, ArrowDown, Settings2, Trash2 } from 'lucide-react';
import { deleteManualItem, deleteTrade, type TradeItem } from '@/lib/api';
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
    case 'TRADE_HOLD': return type === 'SELL' ? 'В продаже' : 'Куплено';
    case 'ACCEPTED': return 'В процессе';
    case 'PENDING': return type === 'SELL' ? 'В продаже' : 'Ожидание';
    case 'CANCELLED': return 'Отменён';
    default: return status;
  }
}

function getTradeBanRemainingMs(trade: TradeItem): number {
  if (!trade.tradedAt) return 0;
  const banEnd = new Date(trade.tradedAt).getTime() + TRADE_BAN_DAYS * 24 * 60 * 60 * 1000;
  const diff = banEnd - Date.now();
  return diff > 0 ? diff : 0;
}

function showTradeBan(trade: TradeItem): boolean {
  // Manual items marked as COMPLETED are considered instantly tradable
  if (trade.platformSource === 'MANUAL' && trade.status === 'COMPLETED') return false;

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
  onReload?: () => void;
}

type SortKey = 'name' | 'wear' | 'float' | 'price' | 'platform' | 'status' | 'tradeban' | 'date';
type SortDir = 'asc' | 'desc';
type ColumnId = SortKey;

const ALL_COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'name', label: 'Предмет' },
  { id: 'wear', label: 'Wear' },
  { id: 'float', label: 'Float' },
  { id: 'price', label: 'Цена' },
  { id: 'platform', label: 'Платформа' },
  { id: 'status', label: 'Статус' },
  { id: 'tradeban', label: 'Трейд-бан' },
  { id: 'date', label: 'Дата' },
];

const DEFAULT_VISIBLE: ColumnId[] = ['name', 'wear', 'float', 'price', 'platform', 'status', 'tradeban', 'date'];
const LS_KEY = 'trades-table-columns';

function loadVisibleColumns(): Set<ColumnId> {
  if (typeof window === 'undefined') return new Set(DEFAULT_VISIBLE);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as ColumnId[];
      if (Array.isArray(arr) && arr.length > 0) return new Set(arr);
    }
  } catch {}
  return new Set(DEFAULT_VISIBLE);
}

function saveVisibleColumns(cols: Set<ColumnId>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(cols)));
}

export default function TradesTable({ trades, type, fxRate, onToggleHide, onBulkHide, isHiddenView, onReload }: TradesTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(loadVisibleColumns);
  const [colsDropdownOpen, setColsDropdownOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colsDropdownRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (trade: TradeItem) => {
    if (!confirm(`Вы уверены, что хотите удалить ${trade.item?.name}?`)) return;
    try {
      if (type === 'BUY' && trade.platformSource === 'MANUAL' && trade.item?.id) {
        await deleteManualItem(trade.item.id);
      } else if (type === 'SELL' && trade.platformSource === 'MANUAL') {
        await deleteTrade(trade.id);
      }
      onReload?.();
    } catch (e) {
      console.error(e);
      alert('Не удалось удалить');
    }
  };

  const toggleColumn = (col: ColumnId) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(col) && next.size > 1) next.delete(col);
      else next.add(col);
      saveVisibleColumns(next);
      return next;
    });
  };

  const show = (col: ColumnId) => visibleCols.has(col);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-accent-blue" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-accent-blue" />;
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTypeDropdownOpen(false);
      }
      if (colsDropdownRef.current && !colsDropdownRef.current.contains(e.target as Node)) {
        setColsDropdownOpen(false);
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
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'name':     cmp = (a.item?.name || '').localeCompare(b.item?.name || ''); break;
          case 'wear':     cmp = (a.item?.wear || '').localeCompare(b.item?.wear || ''); break;
          case 'float':    cmp = (a.item?.floatValue ?? 0) - (b.item?.floatValue ?? 0); break;
          case 'price': {
            const pa = type === 'BUY' ? (a.buyPrice || 0) : (a.sellPrice || 0);
            const pb = type === 'BUY' ? (b.buyPrice || 0) : (b.sellPrice || 0);
            cmp = pa - pb;
            break;
          }
          case 'platform': {
            const pa = a.platformSource === 'MANUAL' ? (a.customSource || 'Manual') : a.platformSource;
            const pb = b.platformSource === 'MANUAL' ? (b.customSource || 'Manual') : b.platformSource;
            cmp = pa.localeCompare(pb);
            break;
          }
          case 'status':   cmp = a.status.localeCompare(b.status); break;
          case 'tradeban': {
            const ta = getTradeBanRemainingMs(a);
            const tb = getTradeBanRemainingMs(b);
            if (ta === 0 && tb === 0) cmp = 0;
            else if (ta === 0) return 1;  // a has no ban → always bottom
            else if (tb === 0) return -1; // b has no ban → always bottom
            else cmp = ta - tb;
            break;
          }
          case 'date':     cmp = new Date(a.tradedAt || 0).getTime() - new Date(b.tradedAt || 0).getTime(); break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    return result;
  }, [trades, search, itemTypeFilter, sortKey, sortDir, type]);

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

        {/* Column visibility settings */}
        <div className="relative" ref={colsDropdownRef}>
          <button
            onClick={() => setColsDropdownOpen(!colsDropdownOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-200 hover:border-dark-600"
            title="Настройка столбцов"
          >
            <Settings2 className="h-4 w-4 text-dark-400" />
          </button>
          {colsDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-dark-700 bg-dark-900 shadow-xl">
              <div className="px-3 py-2 text-xs font-medium text-dark-400 border-b border-dark-700">Столбцы</div>
              {ALL_COLUMNS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleColumn(id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:bg-dark-700/50"
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
                      visibleCols.has(id)
                        ? 'border-accent-blue bg-accent-blue text-white'
                        : 'border-dark-600'
                    }`}
                  >
                    {visibleCols.has(id) && <Check className="h-2.5 w-2.5" />}
                  </span>
                  {label}
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
        <table className="w-full text-sm table-auto">
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
              {show('name') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('name')}>Предмет<SortIcon col="name" /></th>}
              {show('wear') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('wear')}>Wear<SortIcon col="wear" /></th>}
              {show('float') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('float')}>Float<SortIcon col="float" /></th>}
              {show('price') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('price')}>
                {type === 'BUY' ? 'Цена покупки' : 'Цена продажи'}<SortIcon col="price" />
              </th>}
              {show('platform') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('platform')}>Платформа<SortIcon col="platform" /></th>}
              {show('status') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('status')}>Статус<SortIcon col="status" /></th>}
              {show('tradeban') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('tradeban')}>Трейд-бан<SortIcon col="tradeban" /></th>}
              {show('date') && <th className="pb-3 pr-4 font-medium whitespace-nowrap cursor-pointer select-none hover:text-dark-200" onClick={() => toggleSort('date')}>Дата<SortIcon col="date" /></th>}
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
                  {show('name') && (
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
                  )}
                  {show('wear') && (
                    <td className="py-3 pr-4 text-dark-400 whitespace-nowrap">
                      {i?.wear || '—'}
                    </td>
                  )}
                  {show('float') && (
                    <td className="py-3 pr-4 font-mono text-xs text-dark-400 whitespace-nowrap">
                      {i?.floatValue?.toFixed(8) || '—'}
                    </td>
                  )}
                  {show('price') && (
                    <td className="py-3 pr-4 font-medium whitespace-nowrap">
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
                  )}
                  {show('platform') && (
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs font-medium text-dark-300">
                        {trade.platformSource === 'MANUAL' && trade.customSource 
                          ? trade.customSource 
                          : platformLabel(trade.platformSource)}
                      </span>
                    </td>
                  )}
                  {show('status') && (
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          trade.status === 'COMPLETED'
                            ? 'bg-accent-green/10 text-accent-green'
                            : trade.status === 'CANCELLED'
                              ? 'bg-accent-red/10 text-accent-red'
                              : trade.status === 'ACCEPTED'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-accent-orange/10 text-accent-orange'
                        }`}
                      >
                        {getStatusLabel(trade.status, type, trade.platformSource)}
                      </span>
                    </td>
                  )}
                  {show('tradeban') && (
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {trade.tradedAt && showTradeBan(trade) ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-block rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                            Трейд-бан
                          </span>
                          <span className="text-[10px] text-yellow-500/70">
                            {getTradeHoldRemaining(trade.tradedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-dark-600">—</span>
                      )}
                    </td>
                  )}
                  {show('date') && (
                    <td className="py-3 pr-4 text-dark-400 whitespace-nowrap">
                      {formatDate(trade.tradedAt)}
                    </td>
                  )}
                  {onToggleHide && (
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleHide(trade.id)}
                          className="rounded p-1 text-dark-500 transition-colors hover:bg-dark-700 hover:text-dark-300"
                          title={isHiddenView ? 'Показать' : 'Скрыть'}
                        >
                          {isHiddenView ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        {trade.platformSource === 'MANUAL' && (
                          <button
                            onClick={() => handleDelete(trade)}
                            className="rounded p-1 text-dark-500 transition-colors hover:bg-dark-700 hover:text-accent-red"
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
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

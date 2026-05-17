import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Link2, X, Search } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { ProfitEntry, TradeItem } from '@/lib/api';
import { deleteTrade, fetchBuyCandidates, linkBuyToSell } from '@/lib/api';
import EditSaleModal from '@/components/EditSaleModal';
import { formatUSD, formatPercent, formatDate, platformLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProfitTableProps {
  entries: ProfitEntry[];
  onReload?: () => void;
}

type SortKey = 'buyPrice' | 'sellPrice' | 'commission' | 'netSell' | 'profit' | 'profitPercent' | 'sellDate';
type SortDir = 'asc' | 'desc';

export default function ProfitTable({ entries, onReload }: ProfitTableProps) {
  const [editEntry, setEditEntry] = useState<ProfitEntry | null>(null);
  const [linkEntry, setLinkEntry] = useState<ProfitEntry | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('sellDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleDelete = async (entry: ProfitEntry) => {
    if (!confirm(`Вы уверены, что хотите удалить продажу ${entry.itemName}?`)) return;
    try {
      await deleteTrade(entry.sellTradeId);
      onReload?.();
    } catch (e) {
      console.error(e);
      alert('Не удалось удалить продажу');
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'sellDate' ? 'desc' : 'desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ArrowUp className="inline ml-1 h-3 w-3 text-accent-blue" />
      : <ArrowDown className="inline ml-1 h-3 w-3 text-accent-blue" />;
  };

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'sellDate') {
        av = a.sellDate ? new Date(a.sellDate).getTime() : 0;
        bv = b.sellDate ? new Date(b.sellDate).getTime() : 0;
      } else {
        av = a[sortKey] ?? 0;
        bv = b[sortKey] ?? 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [entries, sortKey, sortDir]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-dark-500">
        Нет сматченных сделок за выбранный период
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-700/50 text-left text-dark-400">
            <th className="pb-3 pr-4 font-medium">Предмет</th>
            <th className="pb-3 pr-4 font-medium">Float</th>
            <th className="pb-3 pr-4 font-medium">Bucket</th>
            <th className="pb-3 pr-4 font-medium">Площадки</th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('buyPrice')}>
              Покупка<SortIcon col="buyPrice" />
            </th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('sellPrice')}>
              Продажа<SortIcon col="sellPrice" />
            </th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('commission')}>
              Комиссия<SortIcon col="commission" />
            </th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('netSell')}>
              Чистая продажа<SortIcon col="netSell" />
            </th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('profit')}>
              Профит<SortIcon col="profit" />
            </th>
            <th className="pb-3 pr-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('profitPercent')}>
              Профит %<SortIcon col="profitPercent" />
            </th>
            <th className="pb-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('sellDate')}>
              Дата продажи<SortIcon col="sellDate" />
            </th>
            <th className="pb-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-800">
          {sorted.map((entry, idx) => (
            <tr
              key={idx}
              className="text-dark-200 transition-colors hover:bg-dark-800/50"
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  {entry.imageUrl ? (
                    <img
                      src={
                        entry.imageUrl.startsWith('http')
                          ? entry.imageUrl
                          : `https://community.steamstatic.com/economy/image/${entry.imageUrl}/96fx96f`
                      }
                      alt={entry.itemName}
                      className="h-10 w-14 rounded object-contain bg-dark-700/50"
                    />
                  ) : (
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-dark-700/50 text-dark-500 text-xs">
                      ?
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-dark-50">
                      {entry.itemName}
                    </span>
                    {entry.wear && (
                      <span className="text-[10px] text-dark-500">{entry.wear}</span>
                    )}
                  </div>
                  {entry.manuallyLinked && (
                    <span
                      title="Сделка привязана вручную"
                      className="rounded bg-accent-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-purple"
                    >
                      ручн.
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-dark-400">
                {entry.floatValue != null ? entry.floatValue.toFixed(8) : '—'}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    entry.profitBucket === 'MARKET'
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'bg-dark-700 text-dark-300',
                  )}
                >
                  {entry.profitBucket === 'MARKET' ? 'Market' : 'Other'}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="rounded bg-dark-700 px-1.5 py-0.5 text-dark-300">
                    {entry.buyCustomSource
                      ? entry.buyCustomSource
                      : platformLabel(entry.buyPlatform)}
                  </span>
                  <span className="text-dark-600">→</span>
                  <span className="rounded bg-dark-700 px-1.5 py-0.5 text-dark-300">
                    {entry.sellCustomSource
                      ? entry.sellCustomSource
                      : platformLabel(entry.sellPlatform)}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4">{formatUSD(entry.buyPrice)}</td>
              <td className="py-3 pr-4">{formatUSD(entry.sellPrice)}</td>
              <td className="py-3 pr-4 text-dark-400">
                {(entry.commission * 100).toFixed(0)}%
              </td>
              <td className="py-3 pr-4">{formatUSD(entry.netSell)}</td>
              <td
                className={cn(
                  'py-3 pr-4 font-medium',
                  entry.profit >= 0 ? 'text-accent-green' : 'text-accent-red',
                )}
              >
                {formatUSD(entry.profit)}
              </td>
              <td
                className={cn(
                  'py-3 pr-4 font-medium',
                  entry.profitPercent >= 0
                    ? 'text-accent-green'
                    : 'text-accent-red',
                )}
              >
                {formatPercent(entry.profitPercent)}
              </td>
              <td className="py-3 text-dark-400">
                {formatDate(entry.sellDate)}
              </td>
              <td className="py-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setLinkEntry(entry)}
                    className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-accent-purple transition-colors"
                    title="Перепривязать товар к покупке"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditEntry(entry)}
                    className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-accent-blue transition-colors"
                    title="Редактировать"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-accent-red transition-colors"
                    title="Удалить продажу"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editEntry && (
        <EditSaleModal
          isOpen={!!editEntry}
          onClose={() => setEditEntry(null)}
          onSuccess={() => { setEditEntry(null); onReload?.(); }}
          trade={{
            id: editEntry.sellTradeId,
            externalId: '',
            platformSource: editEntry.sellPlatform as any,
            customSource: editEntry.sellCustomSource,
            buyPrice: null,
            sellPrice: editEntry.sellPrice,
            commission: editEntry.commission,
            type: 'SELL',
            status: 'COMPLETED',
            profitBucket: editEntry.profitBucket,
            tradedAt: editEntry.sellDate || new Date().toISOString(),
            item: {
              id: '',
              name: editEntry.itemName,
              wear: editEntry.wear,
              floatValue: editEntry.floatValue,
              imageUrl: editEntry.imageUrl,
            },
          }}
        />
      )}

      {linkEntry && (
        <LinkBuyModal
          entry={linkEntry}
          onClose={() => setLinkEntry(null)}
          onSuccess={() => { setLinkEntry(null); onReload?.(); }}
        />
      )}
    </div>
  );
}

function LinkBuyModal({
  entry,
  onClose,
  onSuccess,
}: {
  entry: ProfitEntry;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [candidates, setCandidates] = useState<TradeItem[]>([]);
  const [currentBuyId, setCurrentBuyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const data = await fetchBuyCandidates(entry.sellTradeId, q);
      setCandidates(data.candidates);
      setCurrentBuyId(data.currentBuyTradeId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      load(search);
    }, 250);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleLink = async (buyTradeId: string | null) => {
    setSaving(true);
    try {
      await linkBuyToSell(entry.sellTradeId, buyTradeId);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Не удалось привязать BUY');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-dark-50">Привязать покупку</h2>
            <p className="text-xs text-dark-500">Продажа: {entry.itemName}</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию покупки..."
            className="w-full rounded-lg border border-dark-700 bg-dark-800 py-2 pl-9 pr-3 text-sm text-dark-100 placeholder-dark-500 outline-none focus:border-accent-purple"
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-dark-700">
          {loading ? (
            <div className="py-8 text-center text-sm text-dark-500">Загрузка...</div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-sm text-dark-500">Нет доступных покупок</div>
          ) : (
            candidates.map((b) => {
              const isCurrent = b.id === currentBuyId;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={saving}
                  onClick={() => handleLink(b.id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-dark-700/50 px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-dark-700/50',
                    isCurrent && 'bg-accent-purple/10',
                  )}
                >
                  {b.item?.imageUrl ? (
                    <img
                      src={
                        b.item.imageUrl.startsWith('http')
                          ? b.item.imageUrl
                          : `https://community.steamstatic.com/economy/image/${b.item.imageUrl}/96fx96f`
                      }
                      alt={b.item.name}
                      className="h-8 w-12 flex-shrink-0 rounded object-contain bg-dark-700/50"
                    />
                  ) : (
                    <div className="h-8 w-12 flex-shrink-0 rounded bg-dark-700/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-dark-100">{b.item?.name || '—'}</div>
                    <div className="mt-0.5 flex gap-2 text-[10px] text-dark-500">
                      <span>{b.item?.wear || '—'}</span>
                      {b.item?.floatValue != null && <span>float: {b.item.floatValue.toFixed(6)}</span>}
                      <span>{platformLabel(b.platformSource)}{b.customSource ? ` · ${b.customSource}` : ''}</span>
                      <span>{formatDate(b.tradedAt)}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-dark-200">
                    {b.buyPrice != null ? formatUSD(b.buyPrice) : '—'}
                  </div>
                  {isCurrent && (
                    <span className="rounded bg-accent-purple/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-purple">
                      текущая
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {currentBuyId && (
          <button
            type="button"
            disabled={saving}
            onClick={() => handleLink(null)}
            className="mt-3 w-full rounded-lg border border-dark-700 bg-dark-800 py-2 text-sm text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
          >
            Снять ручную привязку (вернуться к авто-матчингу)
          </button>
        )}
      </div>
    </div>
  );
}

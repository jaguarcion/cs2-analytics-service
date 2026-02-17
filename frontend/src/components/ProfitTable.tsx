import { Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ProfitEntry } from '@/lib/api';
import { deleteTrade } from '@/lib/api';
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
                  <span className="font-medium text-dark-50">
                    {entry.itemName}
                  </span>
                </div>
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
          tradeId={editEntry.sellTradeId}
          initialData={{
            price: editEntry.sellPrice,
            customSource: editEntry.sellCustomSource || '',
            date: editEntry.sellDate || '',
          }}
        />
      )}
    </div>
  );
}

import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ProfitEntry } from '@/lib/api';
import { deleteTrade } from '@/lib/api';
import EditSaleModal from '@/components/EditSaleModal';
import { formatUSD, formatPercent, formatDate, platformLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProfitTableProps {
  entries: ProfitEntry[];
  onReload?: () => void;
}

export default function ProfitTable({ entries, onReload }: ProfitTableProps) {
  const [editEntry, setEditEntry] = useState<ProfitEntry | null>(null);

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
            <th className="pb-3 pr-4 font-medium">Покупка</th>
            <th className="pb-3 pr-4 font-medium">Продажа</th>
            <th className="pb-3 pr-4 font-medium">Комиссия</th>
            <th className="pb-3 pr-4 font-medium">Чистая продажа</th>
            <th className="pb-3 pr-4 font-medium">Профит</th>
            <th className="pb-3 pr-4 font-medium">Профит %</th>
            <th className="pb-3 font-medium">Дата продажи</th>
            <th className="pb-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-800">
          {entries.map((entry, idx) => (
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

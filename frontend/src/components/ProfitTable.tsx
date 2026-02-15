'use client';

import type { ProfitEntry } from '@/lib/api';
import { formatUSD, formatPercent, formatDate, platformLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProfitTableProps {
  entries: ProfitEntry[];
}

export default function ProfitTable({ entries }: ProfitTableProps) {
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
            <th className="pb-3 pr-4 font-medium">Покупка</th>
            <th className="pb-3 pr-4 font-medium">Продажа</th>
            <th className="pb-3 pr-4 font-medium">Комиссия</th>
            <th className="pb-3 pr-4 font-medium">Чистая продажа</th>
            <th className="pb-3 pr-4 font-medium">Профит</th>
            <th className="pb-3 pr-4 font-medium">Профит %</th>
            <th className="pb-3 font-medium">Дата продажи</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

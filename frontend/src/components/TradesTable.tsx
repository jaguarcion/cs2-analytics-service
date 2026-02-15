'use client';

import type { TradeItem } from '@/lib/api';
import { formatUSD, formatRUB, formatDate, platformLabel } from '@/lib/utils';

interface TradesTableProps {
  trades: TradeItem[];
  type: 'BUY' | 'SELL';
  fxRate?: number | null; // USDT→RUB rate for conversion
}

export default function TradesTable({ trades, type, fxRate }: TradesTableProps) {
  const getItem = (t: TradeItem) => t.item;

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
            <th className="pb-3 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-800">
          {trades.map((trade) => {
            const i = getItem(trade);
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    {{
                      COMPLETED: type === 'SELL' ? 'Продано' : 'Куплено',
                      TRADE_HOLD: 'Трейд-бан',
                      ACCEPTED: 'В процессе',
                      PENDING: type === 'SELL' ? 'В продаже' : 'Ожидание',
                      CANCELLED: 'Отменён',
                    }[trade.status] || trade.status}
                  </span>
                </td>
                <td className="py-3 text-dark-400">
                  {formatDate(trade.tradedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

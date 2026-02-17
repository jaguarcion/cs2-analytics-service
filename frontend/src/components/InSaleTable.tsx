'use client';

import { useState, useMemo } from 'react';
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { InSaleItem } from '@/lib/api';
import { formatUSD } from '@/lib/utils';

type SortKey = 'name' | 'price' | 'referencePrice' | 'diff' | 'watchers' | 'createdAt' | 'float';
type SortDir = 'asc' | 'desc';

export default function InSaleTable({ items }: { items: InSaleItem[] }) {
    const [sortKey, setSortKey] = useState<SortKey>('price');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedItems = useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => {
            let va: number, vb: number;
            switch (sortKey) {
                case 'name':
                    return sortDir === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                case 'price':
                    va = a.price; vb = b.price; break;
                case 'referencePrice':
                    va = a.referencePrice ?? 0; vb = b.referencePrice ?? 0; break;
                case 'diff':
                    va = a.referencePrice ? a.price - a.referencePrice : 0;
                    vb = b.referencePrice ? b.price - b.referencePrice : 0;
                    break;
                case 'watchers':
                    va = a.watchers; vb = b.watchers; break;
                case 'createdAt':
                    va = new Date(a.createdAt).getTime();
                    vb = new Date(b.createdAt).getTime();
                    break;
                case 'float':
                    va = a.floatValue ?? 0; vb = b.floatValue ?? 0; break;
                default:
                    return 0;
            }
            return sortDir === 'asc' ? va - vb : vb - va;
        });
        return arr;
    }, [items, sortKey, sortDir]);

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown className="inline h-3 w-3 opacity-30" />;
        return sortDir === 'asc'
            ? <ArrowUp className="inline h-3 w-3 text-accent-blue" />
            : <ArrowDown className="inline h-3 w-3 text-accent-blue" />;
    };

    const totalValue = items.reduce((sum, i) => sum + i.price, 0);

    // Time since listing
    function timeSince(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        if (days > 0) return `${days}д ${hours}ч`;
        return `${hours}ч`;
    }

    return (
        <div>
            {/* Summary bar */}
            <div className="mb-4 flex items-center gap-6 rounded-lg border border-dark-800 bg-dark-900/50 px-4 py-3">
                <div>
                    <span className="text-xs text-dark-500">Предметов</span>
                    <p className="text-lg font-semibold text-dark-100">{items.length}</p>
                </div>
                <div>
                    <span className="text-xs text-dark-500">Общая стоимость</span>
                    <p className="text-lg font-semibold text-accent-blue">{formatUSD(totalValue)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-dark-800 bg-dark-900/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-dark-800 text-left text-dark-400">
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Название <SortIcon col="name" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('float')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Float <SortIcon col="float" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Цена <SortIcon col="price" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('referencePrice')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Ref. цена <SortIcon col="referencePrice" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('diff')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Разница <SortIcon col="diff" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('watchers')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    <Eye className="h-3.5 w-3.5" /> <SortIcon col="watchers" />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">
                                <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Листинг <SortIcon col="createdAt" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const diff = item.referencePrice ? item.price - item.referencePrice : null;
                            const diffPercent = item.referencePrice ? ((item.price - item.referencePrice) / item.referencePrice) * 100 : null;

                            return (
                                <tr key={item.id} className="border-b border-dark-800/50 transition-colors hover:bg-dark-800/30">
                                    {/* Name + image */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl && (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="h-10 w-14 rounded object-contain bg-dark-800/50"
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-dark-100 max-w-[280px]">
                                                    {item.isStattrak && <span className="text-orange-400">ST™ </span>}
                                                    {item.itemName || item.name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-dark-500">
                                                    {item.wear && <span>{item.wear}</span>}
                                                    {item.rarity && <span className="text-dark-600">• {item.rarity}</span>}
                                                </div>
                                                {item.stickers.length > 0 && (
                                                    <div className="mt-0.5 flex gap-1">
                                                        {item.stickers.map((s, i) => (
                                                            <img
                                                                key={i}
                                                                src={s.iconUrl}
                                                                alt={s.name}
                                                                title={s.name}
                                                                className="h-4 w-4 object-contain"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Float */}
                                    <td className="px-4 py-3 text-dark-300 font-mono text-xs">
                                        {item.floatValue != null ? item.floatValue.toFixed(10) : '—'}
                                    </td>
                                    {/* Price */}
                                    <td className="px-4 py-3 font-medium text-dark-100">
                                        {formatUSD(item.price)}
                                    </td>
                                    {/* Reference price */}
                                    <td className="px-4 py-3 text-dark-400">
                                        {item.referencePrice ? formatUSD(item.referencePrice) : '—'}
                                        {item.quantity && (
                                            <span className="ml-1 text-[10px] text-dark-600">({item.quantity})</span>
                                        )}
                                    </td>
                                    {/* Diff */}
                                    <td className="px-4 py-3">
                                        {diff !== null ? (
                                            <span className={diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-dark-400'}>
                                                {diff > 0 ? '+' : ''}{formatUSD(diff)}
                                                {diffPercent !== null && (
                                                    <span className="ml-1 text-[10px] opacity-70">
                                                        ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                                                    </span>
                                                )}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    {/* Watchers */}
                                    <td className="px-4 py-3 text-center">
                                        {item.watchers > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue">
                                                <Eye className="h-3 w-3" /> {item.watchers}
                                            </span>
                                        ) : (
                                            <span className="text-dark-600">0</span>
                                        )}
                                    </td>
                                    {/* Listed at */}
                                    <td className="px-4 py-3 text-dark-400 text-xs whitespace-nowrap">
                                        {timeSince(item.createdAt)} назад
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedItems.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-dark-500">
                                    Нет предметов в продаже
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

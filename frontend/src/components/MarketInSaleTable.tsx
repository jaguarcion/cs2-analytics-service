'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { MarketInSaleItem } from '@/lib/api';
import { formatRUB } from '@/lib/utils';

type SortKey = 'name' | 'price' | 'createdAt' | 'float';
type SortDir = 'asc' | 'desc';

export default function MarketInSaleTable({ items, fxRate }: { items: MarketInSaleItem[]; fxRate?: number | null }) {
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
    const toUsd = (rub: number) => fxRate && fxRate > 0 ? rub / fxRate : null;

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
                    <p className="text-lg font-semibold text-accent-blue">
                        {formatRUB(totalValue)}
                        {toUsd(totalValue) !== null && (
                            <span className="ml-2 text-sm text-dark-400">≈ ${toUsd(totalValue)!.toFixed(2)}</span>
                        )}
                    </p>
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
                                <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-dark-200">
                                    Листинг <SortIcon col="createdAt" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => (
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
                                                {item.isSouvenir && <span className="text-yellow-400">Sv. </span>}
                                                {item.itemName || item.name}
                                            </p>
                                            {item.wear && (
                                                <span className="text-xs text-dark-500">{item.wear}</span>
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
                                    {formatRUB(item.price)}
                                    {toUsd(item.price) !== null && (
                                        <span className="ml-1 text-[10px] text-dark-500">≈ ${toUsd(item.price)!.toFixed(2)}</span>
                                    )}
                                </td>
                                {/* Listed at */}
                                <td className="px-4 py-3 text-dark-400 text-xs whitespace-nowrap">
                                    {item.createdAt ? `${timeSince(item.createdAt)} назад` : '—'}
                                </td>
                            </tr>
                        ))}
                        {sortedItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-dark-500">
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


'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createManualSale, type TradeItem } from '@/lib/api';
import { X, Search, ChevronDown } from 'lucide-react';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: TradeItem[]; // Available items to sell
}

export default function AddSaleModal({ isOpen, onClose, onSuccess, items }: AddSaleModalProps) {
  const [formData, setFormData] = useState({
    itemId: '',
    sellPrice: '',
    customSource: 'Buff',
    saleDate: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);
  
  // Searchable dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const lower = searchQuery.toLowerCase();
    return items.filter(i => i.item?.name.toLowerCase().includes(lower));
  }, [items, searchQuery]);

  const selectedItem = items.find(i => i.item?.id === formData.itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) {
        alert('Пожалуйста, выберите предмет');
        return;
    }
    setLoading(true);
    try {
      await createManualSale({
        itemId: formData.itemId,
        sellPrice: parseFloat(formData.sellPrice),
        customSource: formData.customSource,
        saleDate: new Date(formData.saleDate).toISOString(),
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        itemId: '',
        sellPrice: '',
        customSource: 'Buff',
        saleDate: new Date().toISOString().slice(0, 16),
      });
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create sale:', error);
      alert('Не удалось создать продажу. Возможно предмет уже продан.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-50">Добавить продажу</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="mb-1 block text-xs font-medium text-dark-300">Предмет</label>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none hover:border-dark-600"
            >
              <span className="truncate pr-2">
                {selectedItem 
                  ? `${selectedItem.item?.name} (${selectedItem.item?.wear || '-'})` 
                  : 'Выберите предмет'}
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-dark-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-dark-700 bg-dark-800 shadow-xl">
                <div className="sticky top-0 border-b border-dark-700 bg-dark-800 p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск..."
                      className="w-full rounded bg-dark-900 py-1.5 pl-8 pr-2 text-xs text-white placeholder-dark-500 outline-none focus:ring-1 focus:ring-accent-purple/50"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="py-1">
                  {filteredItems.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-dark-500">Ничего не найдено</div>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.item?.id || item.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, itemId: item.item?.id || '' });
                          setDropdownOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-dark-700 border-b border-dark-700/50 last:border-0 ${
                          formData.itemId === item.item?.id ? 'bg-accent-purple/10 text-accent-purple' : 'text-dark-200'
                        }`}
                      >
                        <div className="font-medium truncate">{item.item?.name}</div>
                        <div className="mt-0.5 flex justify-between text-xs text-dark-500">
                          <span>{item.item?.wear || '-'} {item.item?.floatValue ? `(${item.item.floatValue.toFixed(4)})` : ''}</span>
                          <span>${item.buyPrice}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Цена продажи (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.sellPrice}
                onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                placeholder="120.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Площадка</label>
              <input
                type="text"
                required
                value={formData.customSource}
                onChange={(e) => setFormData({ ...formData, customSource: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                placeholder="Buff..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Дата продажи</label>
            <input
              type="datetime-local"
              required
              value={formData.saleDate}
              onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-accent-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить продажу'}
          </button>
        </form>
      </div>
    </div>
  );
}

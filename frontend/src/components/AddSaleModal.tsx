
'use client';

import { useState } from 'react';
import { createManualSale, type TradeItem } from '@/lib/api';
import { X } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) {
        alert('Please select an item');
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
    } catch (error) {
      console.error('Failed to create sale:', error);
      alert('Failed to create sale');
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
          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Предмет</label>
            <select
              required
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
            >
              <option value="">Выберите предмет</option>
              {items.map((item) => (
                <option key={item.item?.id || item.id} value={item.item?.id}>
                  {item.item?.name} ({item.item?.wear || 'Unknown'}) - {item.buyPrice} {item.type === 'BUY' ? 'USD' : ''}
                </option>
              ))}
            </select>
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
            {loading ? 'Processing...' : 'Сохранить продажу'}
          </button>
        </form>
      </div>
    </div>
  );
}

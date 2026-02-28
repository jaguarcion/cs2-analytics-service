
'use client';

import { useState, useEffect } from 'react';
import { updateTrade, type TradeItem } from '@/lib/api';
import { X } from 'lucide-react';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trade: TradeItem | null;
}

export default function EditSaleModal({ isOpen, onClose, onSuccess, trade }: EditSaleModalProps) {
  const [formData, setFormData] = useState({
    sellPrice: '',
    commission: '',
    customSource: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trade) {
      setFormData({
        sellPrice: trade.sellPrice?.toString() || '',
        commission: trade.commission?.toString() || '5',
        customSource: trade.customSource || '',
      });
    }
  }, [trade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;

    setLoading(true);
    try {
      await updateTrade(trade.id, {
        price: parseFloat(formData.sellPrice),
        commission: formData.commission ? parseFloat(formData.commission) : 0,
        customSource: formData.customSource,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update sale:', error);
      alert('Не удалось обновить продажу');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-50">Редактировать продажу</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Предмет</label>
            <div className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-400">
              {trade.item?.name || '—'}
            </div>
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
              <label className="mb-1 block text-xs font-medium text-dark-300">Комиссия (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                placeholder="5.00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Площадка (Source)</label>
            <input
              type="text"
              required
              value={formData.customSource}
              onChange={(e) => setFormData({ ...formData, customSource: e.target.value })}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
              placeholder="Buff, Waxpeer..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-accent-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  );
}

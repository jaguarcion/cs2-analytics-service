
'use client';

import { useState, useEffect } from 'react';
import { updateManualItem, updateTrade, type TradeItem } from '@/lib/api';
import { X } from 'lucide-react';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trade: TradeItem | null;
}

export default function EditItemModal({ isOpen, onClose, onSuccess, trade }: EditItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    wear: '',
    floatValue: '',
    buyPrice: '',
    commission: '',
    customSource: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trade && trade.item) {
      setFormData({
        name: trade.item.name || '',
        wear: trade.item.wear || '',
        floatValue: trade.item.floatValue?.toString() || '',
        buyPrice: trade.buyPrice?.toString() || '',
        commission: trade.commission?.toString() || '0',
        customSource: trade.customSource || '',
      });
    }
  }, [trade]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    let wear = formData.wear;
    
    const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    for (const w of wears) {
      if (name.includes(w) || name.includes(`(${w})`)) {
        wear = w;
        break;
      }
    }
    
    setFormData(prev => ({ ...prev, name, wear }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade || !trade.item) return;

    setLoading(true);
    try {
      await updateManualItem(trade.item.id, {
        name: formData.name,
        wear: formData.wear || undefined,
        floatValue: formData.floatValue ? parseFloat(formData.floatValue) : undefined,
        customSource: formData.customSource,
      });

      await updateTrade(trade.id, {
        price: parseFloat(formData.buyPrice),
        customSource: formData.customSource,
        commission: formData.commission ? parseFloat(formData.commission) : 0,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Не удалось обновить предмет');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-50">Редактировать предмет</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Название предмета</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={handleNameChange}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
              placeholder="★ Karambit | Doppler (Factory New)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Wear</label>
              <select
                value={formData.wear}
                onChange={(e) => setFormData({ ...formData, wear: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
              >
                <option value="">Не указано</option>
                <option value="Factory New">Factory New</option>
                <option value="Minimal Wear">Minimal Wear</option>
                <option value="Field-Tested">Field-Tested</option>
                <option value="Well-Worn">Well-Worn</option>
                <option value="Battle-Scarred">Battle-Scarred</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Float</label>
              <input
                type="number"
                step="0.00000000000001"
                value={formData.floatValue}
                onChange={(e) => setFormData({ ...formData, floatValue: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                placeholder="0.035..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Цена покупки (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.buyPrice}
                onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                placeholder="100.00"
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
                placeholder="2.00"
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

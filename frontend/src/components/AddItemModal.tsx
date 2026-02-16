
'use client';

import { useState, useEffect } from 'react';
import { createManualItem } from '@/lib/api';
import { X } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    wear: '',
    floatValue: '',
    buyPrice: '',
    customSource: 'Buff',
    status: 'Trade Ban',
    purchaseDate: new Date().toISOString().slice(0, 16),
    tradeBanDate: '',
  });
  const [loading, setLoading] = useState(false);

  // Auto-calculate trade ban date when purchase date changes or status is Trade Ban
  useEffect(() => {
    if (formData.status === 'Trade Ban' && formData.purchaseDate) {
      const date = new Date(formData.purchaseDate);
      date.setDate(date.getDate() + 7); // Default 7 days
      setFormData(prev => ({ ...prev, tradeBanDate: date.toISOString().slice(0, 16) }));
    }
  }, [formData.purchaseDate, formData.status]);

  // Parse wear from name
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
    setLoading(true);
    try {
      await createManualItem({
        name: formData.name,
        wear: formData.wear || undefined,
        floatValue: formData.floatValue ? parseFloat(formData.floatValue) : undefined,
        buyPrice: parseFloat(formData.buyPrice),
        customSource: formData.customSource,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        tradeBanDate: formData.status === 'Trade Ban' && formData.tradeBanDate ? new Date(formData.tradeBanDate).toISOString() : undefined,
        status: formData.status,
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        wear: '',
        floatValue: '',
        buyPrice: '',
        customSource: 'Buff',
        status: 'Trade Ban',
        purchaseDate: new Date().toISOString().slice(0, 16),
        tradeBanDate: '',
      });
    } catch (error) {
      console.error('Failed to create item:', error);
      alert('Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-50">Добавить предмет</h2>
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Статус</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
            >
              <option value="Trade Ban">Trade Ban (Трейд-бан)</option>
              <option value="Tradable">Tradable (Доступен)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Дата покупки</label>
              <input
                type="datetime-local"
                required
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
              />
            </div>
            {formData.status === 'Trade Ban' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-dark-300">Дата разбана</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.tradeBanDate}
                  onChange={(e) => setFormData({ ...formData, tradeBanDate: e.target.value })}
                  className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-accent-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Добавить предмет'}
          </button>
        </form>
      </div>
    </div>
  );
}

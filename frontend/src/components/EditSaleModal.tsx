
'use client';

import { useState, useEffect } from 'react';
import { updateTrade } from '@/lib/api';
import { X } from 'lucide-react';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tradeId: string;
  initialData: {
    price: number;
    customSource: string;
    date: string;
  };
}

export default function EditSaleModal({ isOpen, onClose, onSuccess, tradeId, initialData }: EditSaleModalProps) {
  const [formData, setFormData] = useState({
    price: '',
    customSource: '',
    date: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        price: initialData.price.toString(),
        customSource: initialData.customSource || '',
        date: initialData.date ? new Date(initialData.date).toISOString().slice(0, 16) : '',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTrade(tradeId, {
        price: parseFloat(formData.price),
        customSource: formData.customSource,
        date: new Date(formData.date).toISOString(),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update sale:', error);
      alert('Failed to update sale');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-dark-300">Цена продажи (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
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
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dark-300">Дата продажи</label>
            <input
              type="datetime-local"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white focus:border-accent-purple focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-accent-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}

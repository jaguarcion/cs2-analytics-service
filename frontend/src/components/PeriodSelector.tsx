'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Period } from '@/lib/api';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  onCustomRange?: (from: string, to: string) => void;
  customFrom?: string;
  customTo?: string;
}

const periods: { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

export default function PeriodSelector({ value, onChange, onCustomRange, customFrom, customTo }: PeriodSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(customFrom || '');
  const [toDate, setToDate] = useState(customTo || '');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const handleApply = () => {
    if (fromDate && toDate && onCustomRange) {
      onCustomRange(fromDate, toDate);
      setShowPicker(false);
    }
  };

  return (
    <div className="relative flex items-center gap-1 rounded-lg bg-dark-800 p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            value === p.value
              ? 'bg-accent-blue text-white shadow-sm'
              : 'text-dark-400 hover:text-dark-200',
          )}
        >
          {p.label}
        </button>
      ))}

      {/* Calendar button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          'rounded-md p-1.5 transition-all',
          value === 'custom'
            ? 'bg-accent-blue text-white shadow-sm'
            : 'text-dark-400 hover:text-dark-200',
        )}
        title="Выбрать период"
      >
        <Calendar className="h-4 w-4" />
      </button>

      {/* Date picker popup */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-dark-700 bg-dark-900 p-4 shadow-2xl"
        >
          <p className="mb-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Произвольный период</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-dark-400">От</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white outline-none focus:border-accent-blue transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-dark-400">До</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-white outline-none focus:border-accent-blue transition-colors"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={!fromDate || !toDate}
              className="w-full rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { Period } from '@/lib/api';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: '3months', label: '3 месяца' },
];

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-dark-800 p-1">
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
    </div>
  );
}

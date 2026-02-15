'use client';

import { cn } from '@/lib/utils';
import type { Platform } from '@/lib/api';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
}

const platforms: { value: Platform; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CSFLOAT', label: 'CSFloat' },
  { value: 'MARKET_CSGO', label: 'Market.CSGO' },
];

export default function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-dark-800 p-1">
      {platforms.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            value === p.value
              ? 'bg-accent-purple text-white shadow-sm'
              : 'text-dark-400 hover:text-dark-200',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dark-700/50 bg-dark-800/80 backdrop-blur-sm p-5 transition-all hover:border-dark-600/50',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-dark-400">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold tracking-tight',
              trend === 'up' && 'text-accent-green',
              trend === 'down' && 'text-accent-red',
              !trend && 'text-dark-50',
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-dark-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-dark-700/50 p-2.5 text-dark-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

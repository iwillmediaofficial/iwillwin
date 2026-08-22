import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: 'gold' | 'emerald' | 'blue' | 'purple';
  className?: string;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, subtitle, icon, trend, variant = 'gold', className }, ref) => {
    const variantGlow = {
      gold: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
      emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
      blue: 'border-sky-500/30 bg-sky-500/5 text-sky-400',
      purple: 'border-purple-500/30 bg-purple-500/5 text-purple-400',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between overflow-hidden transition-all duration-200 hover:border-slate-700',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className={cn('p-2.5 rounded-xl border', variantGlow[variant])}>
            {icon}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </span>
          {subtitle && (
            <span className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>{subtitle}</span>
              {trend && <span className="text-emerald-400 font-semibold">{trend}</span>}
            </span>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

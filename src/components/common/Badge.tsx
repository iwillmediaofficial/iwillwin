import React from 'react';
import { cn } from '@/lib/utils';
import type { CampaignStatus, ScratchStatus } from '@/types/database';

export interface BadgeProps {
  status?: CampaignStatus | ScratchStatus | 'admin' | 'super_admin' | 'active' | 'inactive' | string;
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children, className }) => {
  let computedVariant = variant || 'default';
  let label = children || status;

  if (!variant && status) {
    switch (status) {
      case 'Active':
      case 'Revealed':
      case 'active':
        computedVariant = 'success';
        break;
      case 'Draft':
      case 'Pending':
        computedVariant = 'warning';
        break;
      case 'Paused':
      case 'inactive':
        computedVariant = 'danger';
        break;
      case 'Completed':
      case 'admin':
      case 'super_admin':
        computedVariant = 'gold';
        break;
      default:
        computedVariant = 'default';
    }
  }

  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    gold: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    warning: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    danger: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none',
        variantStyles[computedVariant],
        className
      )}
    >
      {label}
    </span>
  );
};

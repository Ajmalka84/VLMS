import React from 'react';
import { formatINR } from '../../utils/formatters';

export interface CurrencyBadgeProps {
  amount: number | string | undefined | null;
  variant?: 'emerald' | 'amber' | 'rose' | 'slate' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  decimals?: number;
  className?: string;
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = React.memo(
  ({ amount, variant = 'auto', size = 'md', decimals = 0, className = '' }) => {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));

    let effectiveVariant = variant;
    if (variant === 'auto') {
      if (num > 0) effectiveVariant = 'emerald';
      else if (num < 0) effectiveVariant = 'rose';
      else effectiveVariant = 'slate';
    }

    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base sm:text-lg px-3 py-1.5',
    }[size];

    const variantClasses = {
      emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      slate: 'bg-slate-800/80 border-slate-700 text-slate-300',
    }[effectiveVariant as 'emerald' | 'amber' | 'rose' | 'slate'];

    return (
      <span
        className={`inline-flex items-center font-mono font-bold rounded-xl border ${sizeClasses} ${variantClasses} ${className}`}
      >
        {formatINR(amount, { decimals })}
      </span>
    );
  }
);

CurrencyBadge.displayName = 'CurrencyBadge';

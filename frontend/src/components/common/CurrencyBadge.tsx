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
      emerald: 'badge-emerald',
      amber: 'badge-amber',
      rose: 'badge-rose',
      slate: 'badge-slate',
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

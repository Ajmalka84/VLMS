import React from 'react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'rose' | 'blue';
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<
  NonNullable<MetricCardProps['variant']>,
  {
    iconBg: string;
    iconText: string;
    border: string;
    valueText: string;
    highlight?: string;
  }
> = {
  default: {
    iconBg: 'bg-surface text-secondary',
    iconText: 'text-secondary',
    border: 'border-subtle',
    valueText: 'text-primary',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    iconText: 'text-amber-500',
    border: 'border-amber-500/30 ring-1 ring-amber-500/10',
    valueText: 'text-amber-500',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    iconText: 'text-emerald-500',
    border: 'border-emerald-500/30',
    valueText: 'text-emerald-500',
  },
  rose: {
    iconBg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    iconText: 'text-rose-500',
    border: 'border-rose-500/30',
    valueText: 'text-rose-500',
  },
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    iconText: 'text-blue-500',
    border: 'border-blue-500/30',
    valueText: 'text-blue-500',
  },
};

export const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ label, value, subLabel, subtext, icon, variant = 'default', onClick, className = '' }) => {
    const style = variantStyles[variant];
    const displaySub = subLabel || subtext;

    return (
      <Card
        variant="glass"
        onClick={onClick}
        className={`p-4 sm:p-5 border ${style.border} bg-surface-solid/80 transition-all ${
          onClick ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 active:scale-[0.99]' : ''
        } ${className}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 truncate">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider block truncate">
              {label}
            </span>
            <div className={`text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight truncate ${style.valueText}`}>
              {value}
            </div>
            {displaySub && <div className="text-[11px] text-muted truncate">{displaySub}</div>}
          </div>

          {icon && (
            <div className={`p-2.5 sm:p-3 rounded-2xl shrink-0 flex items-center justify-center ${style.iconBg}`}>
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

MetricCard.displayName = 'MetricCard';

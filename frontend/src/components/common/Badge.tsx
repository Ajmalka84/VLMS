import React from 'react';
import { X } from 'lucide-react';

export type BadgeVariant =
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'slate';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotPulse?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Badge = React.memo<BadgeProps>(({
  variant = 'amber',
  size = 'md',
  dot = false,
  dotPulse = false,
  icon,
  onRemove,
  children,
  className = '',
  title,
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; dot: string }> = {
    amber: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      dot: 'bg-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
    },
    rose: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      dot: 'bg-rose-400',
    },
    blue: {
      bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      dot: 'bg-blue-400',
    },
    purple: {
      bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
      dot: 'bg-purple-400',
    },
    cyan: {
      bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
      dot: 'bg-cyan-400',
    },
    slate: {
      bg: 'bg-slate-800/80 border-slate-700/80 text-slate-300',
      dot: 'bg-slate-400',
    },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-md font-bold',
    md: 'px-2.5 py-1 text-xs gap-1.5 rounded-full font-bold',
    lg: 'px-3 py-1.5 text-xs sm:text-sm gap-2 rounded-full font-extrabold',
  };

  const current = variantStyles[variant];

  return (
    <span
      title={title}
      className={`inline-flex items-center border shadow-sm select-none whitespace-nowrap ${
        current.bg
      } ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
        </span>
      )}

      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove badge"
          className="p-0.5 hover:bg-slate-950/40 rounded-full transition cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

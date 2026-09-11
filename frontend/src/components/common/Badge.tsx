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
  const variantClasses: Record<BadgeVariant, { class: string; dot: string }> = {
    amber: { class: 'badge-amber', dot: 'var(--badge-amber-dot)' },
    emerald: { class: 'badge-emerald', dot: 'var(--badge-emerald-dot)' },
    rose: { class: 'badge-rose', dot: 'var(--badge-rose-dot)' },
    blue: { class: 'badge-blue', dot: 'var(--badge-blue-dot)' },
    purple: { class: 'badge-purple', dot: 'var(--badge-purple-dot)' },
    cyan: { class: 'badge-cyan', dot: 'var(--badge-cyan-dot)' },
    slate: { class: 'badge-slate', dot: 'var(--badge-slate-dot)' },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px] gap-1 rounded-md font-bold',
    md: 'px-2.5 py-1 text-xs gap-1.5 rounded-full font-bold',
    lg: 'px-3 py-1.5 text-xs sm:text-sm gap-2 rounded-full font-extrabold',
  };

  const current = variantClasses[variant];

  return (
    <span
      title={title}
      className={`inline-flex items-center border shadow-sm select-none whitespace-nowrap ${
        current.class
      } ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {dotPulse && (
            <span
              style={{ backgroundColor: current.dot }}
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            />
          )}
          <span
            style={{ backgroundColor: current.dot }}
            className="relative inline-flex rounded-full h-2 w-2"
          />
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
          className="p-0.5 opacity-70 hover:opacity-100 rounded-full transition cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

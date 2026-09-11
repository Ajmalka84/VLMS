import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'ghost'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.memo<ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold transition-all duration-150 select-none touch-manipulation cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 border border-amber-400/30',
    secondary:
      'bg-surface hover:bg-surface-elevated text-primary border border-subtle shadow-sm',
    danger:
      'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 hover:text-rose-400 shadow-sm',
    success:
      'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 hover:text-emerald-400 shadow-sm',
    ghost:
      'bg-transparent hover:bg-surface-elevated text-secondary hover:text-primary',
    outline:
      'bg-transparent border border-subtle hover:bg-surface text-secondary hover:text-primary',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-xl min-h-[36px] gap-1.5',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-2xl min-h-[44px] gap-2',
    lg: 'px-5 py-3 text-sm sm:text-base rounded-2xl min-h-[48px] gap-2.5',
    icon: 'p-2.5 rounded-2xl min-h-[40px] min-w-[40px] justify-center',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children ? <span>{children}</span> : null}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 pointer-events-none">{leftIcon}</span>}
          {children && <span className="truncate pointer-events-none">{children}</span>}
          {rightIcon && <span className="shrink-0 pointer-events-none">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

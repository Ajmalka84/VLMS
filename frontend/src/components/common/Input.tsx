import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  fullWidth?: boolean;
  containerClassName?: string;
}

export const Input = React.memo(
  forwardRef<HTMLInputElement, InputProps>(
    (
      {
        label,
        error,
        helperText,
        leftIcon,
        rightSlot,
        fullWidth = true,
        containerClassName = '',
        className = '',
        disabled,
        id,
        ...props
      },
      ref,
    ) => {
      const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

      return (
        <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5 ${containerClassName}`}>
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-semibold text-secondary block select-none"
            >
              {label}
            </label>
          )}

          <div className="relative flex items-center">
            {leftIcon && (
              <div className="absolute left-3.5 flex items-center justify-center text-muted pointer-events-none">
                {leftIcon}
              </div>
            )}

            <input
              ref={ref}
              id={inputId}
              disabled={disabled}
              className={`w-full bg-surface-solid border rounded-2xl text-xs sm:text-sm font-semibold text-primary placeholder:text-muted transition-all duration-150 outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                leftIcon ? 'pl-10' : 'pl-3.5'
              } ${rightSlot ? 'pr-10' : 'pr-3.5'} py-2.5 min-h-[44px] ${
                error
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-sm shadow-rose-950/50'
                  : 'border-subtle focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50'
              } ${className}`}
              {...props}
            />

            {rightSlot && (
              <div className="absolute right-3.5 flex items-center justify-center text-muted">
                {rightSlot}
              </div>
            )}
          </div>

          {error ? (
            <p className="text-[11px] font-bold text-rose-400 animate-fade-in">{error}</p>
          ) : helperText ? (
            <p className="text-[11px] text-muted">{helperText}</p>
          ) : null}
        </div>
      );
    },
  ),
);

Input.displayName = 'Input';

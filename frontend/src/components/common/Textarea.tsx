import React, { forwardRef } from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  containerClassName?: string;
  showCount?: boolean;
}

export const Textarea = React.memo(
  forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
      {
        label,
        error,
        helperText,
        fullWidth = true,
        containerClassName = '',
        className = '',
        disabled,
        rows = 3,
        maxLength,
        showCount = false,
        value,
        id,
        ...props
      },
      ref,
    ) => {
      const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
      const currentLength = typeof value === 'string' ? value.length : 0;

      return (
        <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5 ${containerClassName}`}>
          {label && (
            <div className="flex items-center justify-between">
              <label
                htmlFor={textareaId}
                className="text-xs font-semibold text-secondary block select-none"
              >
                {label}
              </label>

              {showCount && maxLength && (
                <span className="text-[10px] text-muted font-mono">
                  {currentLength}/{maxLength}
                </span>
              )}
            </div>
          )}

          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            maxLength={maxLength}
            value={value}
            disabled={disabled}
            className={`w-full bg-surface-solid border rounded-2xl p-3 text-xs sm:text-sm font-semibold text-primary placeholder:text-muted transition-all duration-150 outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-sm shadow-rose-950/50'
                : 'border-subtle focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50'
            } ${className}`}
            {...props}
          />

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

Textarea.displayName = 'Textarea';

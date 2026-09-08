import React, { useRef } from 'react';
import { Calendar, X } from 'lucide-react';

export interface DateInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
  id?: string;
  clearable?: boolean;
}

export const DateInput = React.memo<DateInputProps>(({
  label,
  value,
  onChange,
  min,
  max,
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  containerClassName = '',
  className = '',
  id,
  clearable = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'date-input');

  const openPicker = () => {
    if (disabled) return;
    try {
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full flex-1 min-w-0' : ''} space-y-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={dateInputId}
          className="text-xs font-semibold text-slate-300 block select-none"
        >
          {label}
        </label>
      )}

      <div
        className="relative flex items-center cursor-pointer group"
        onClick={openPicker}
      >
        <div className="absolute left-3.5 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors pointer-events-none z-10">
          <Calendar className="w-4 h-4 text-amber-400" />
        </div>

        <input
          ref={inputRef}
          id={dateInputId}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            if (disabled) return;
            try {
              e.currentTarget.showPicker?.();
            } catch {
              // fallback
            }
          }}
          min={min}
          max={max}
          disabled={disabled}
          style={{ colorScheme: 'dark' }}
          className={`w-full h-[46px] min-h-[46px] bg-slate-950/80 border rounded-2xl pl-10 ${
            clearable && value ? 'pr-11' : 'pr-4'
          } py-2.5 text-xs sm:text-sm font-semibold text-white transition-all duration-150 outline-none select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-sm shadow-rose-950/50'
              : 'border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 hover:border-slate-700'
          } ${className}`}
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            aria-label="Clear date"
            className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-bold text-rose-400 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

DateInput.displayName = 'DateInput';


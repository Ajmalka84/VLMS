import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

export const Checkbox = React.memo<CheckboxProps>(({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  error,
  className = '',
  id,
}) => {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`space-y-1 ${className}`}>
      <div
        className={`inline-flex items-start gap-2.5 select-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <button
          id={checkboxId}
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
            checked
              ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm shadow-amber-500/20'
              : 'bg-surface-solid border-subtle text-transparent hover:border-slate-400 dark:hover:border-slate-600'
          } ${error ? 'border-rose-500' : ''}`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[3] text-slate-950 pointer-events-none" />}
        </button>

        {(label || description) && (
          <div className="space-y-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-xs font-bold text-primary block cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-[11px] text-secondary leading-tight">{description}</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-bold text-rose-400 pl-7">{error}</p>}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

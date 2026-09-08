import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const ToggleSwitch = React.memo<ToggleSwitchProps>(({
  checked,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  className = '',
  id,
}) => {
  const switchId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const sizeTrack: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'w-8 h-4.5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7.5',
  };

  const sizeThumb: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'w-3.5 h-3.5 translate-x-0.5',
    md: 'w-5 h-5 translate-x-0.5',
    lg: 'w-6.5 h-6.5 translate-x-0.5',
  };

  const activeThumbTranslate: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'translate-x-4',
    md: 'translate-x-5.5',
    lg: 'translate-x-7',
  };

  return (
    <div
      className={`inline-flex items-center justify-between gap-3 select-none cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className="text-xs font-bold text-slate-200 block cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-slate-400 leading-tight">{description}</p>
          )}
        </div>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
          sizeTrack[size]
        } ${checked ? 'bg-amber-500 shadow-md shadow-amber-500/20' : 'bg-slate-800'}`}
      >
        <span
          className={`inline-block rounded-full bg-slate-950 shadow-md transform transition-transform duration-200 ease-in-out pointer-events-none ${
            sizeThumb[size]
          } ${checked ? activeThumbTranslate[size] : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
});

ToggleSwitch.displayName = 'ToggleSwitch';

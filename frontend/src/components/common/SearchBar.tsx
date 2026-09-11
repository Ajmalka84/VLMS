import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchBarProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  shortcutHint?: string;
  id?: string;
}

export const SearchBar = React.memo<SearchBarProps>(({
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  onClear,
  placeholder = 'Search...',
  debounceMs = 250,
  loading = false,
  className = '',
  containerClassName = '',
  autoFocus = false,
  disabled = false,
  shortcutHint,
  id = 'global-search-bar',
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = isControlled ? controlledValue : internalValue;
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if controlled value changes
  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  // Debounced search trigger
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => {
      onSearch(activeValue);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [activeValue, debounceMs, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

  const handleClear = useCallback(() => {
    if (!isControlled) {
      setInternalValue('');
    }
    onChange?.('');
    onSearch?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [isControlled, onChange, onSearch, onClear]);

  // Global shortcut handler (e.g. Cmd+K or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      {/* Search Icon / Spinner */}
      <div className="absolute left-3.5 flex items-center justify-center text-muted pointer-events-none">
        {loading ? (
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-muted" />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={activeValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={`w-full pl-10 pr-16 py-2.5 bg-surface-solid border border-subtle rounded-2xl text-xs sm:text-sm font-semibold text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 min-h-[44px] transition-all select-none disabled:opacity-50 ${className}`}
      />

      {/* Right Slot: Clear button & Shortcut indicator */}
      <div className="absolute right-2.5 flex items-center gap-1.5">
        {activeValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {shortcutHint && !activeValue && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-muted bg-surface border border-subtle rounded-lg shadow-inner select-none pointer-events-none">
            {shortcutHint}
          </kbd>
        )}
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

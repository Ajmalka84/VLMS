import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  searchable?: boolean;
  maxDisplayTags?: number;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  id?: string;
}

export const MultiSelect = React.memo<MultiSelectProps>(({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  label,
  error,
  helperText,
  searchable = true,
  maxDisplayTags = 2,
  disabled = false,
  className = '',
  containerClassName = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 260 && spaceAbove > 260) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
    setIsOpen((prev) => !prev);
  }, [disabled, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)),
    );
  }, [options, search]);

  // Toggle single option
  const toggleOption = useCallback(
    (optValue: string) => {
      if (value.includes(optValue)) {
        onChange(value.filter((v) => v !== optValue));
      } else {
        onChange([...value, optValue]);
      }
    },
    [value, onChange],
  );

  // Remove single tag
  const removeTag = (e: React.MouseEvent, optValue: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  // Select All / Clear All
  const handleSelectAll = () => {
    const allFilteredValues = filteredOptions.map((o) => o.value);
    const combined = Array.from(new Set([...value, ...allFilteredValues]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Map selected values to options
  const selectedOptions = useMemo(() => {
    return options.filter((o) => value.includes(o.value));
  }, [options, value]);

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'multiselect');

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex-1 min-w-0 space-y-1.5 ${
        isOpen ? 'z-[99]' : 'z-10'
      } ${containerClassName}`}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-secondary block select-none"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        id={selectId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className={`w-full min-h-[46px] px-3.5 py-2 bg-surface-solid border rounded-2xl flex items-center justify-between gap-2 cursor-pointer select-none transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-700'
        } ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
            : error
            ? 'border-rose-500/80 shadow-sm shadow-rose-950/50'
            : 'border-subtle'
        } ${className}`}
      >
        {/* Selected Tags / Placeholder */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-xs sm:text-sm font-semibold text-muted">
              {placeholder}
            </span>
          ) : (
            <>
              {selectedOptions.slice(0, maxDisplayTags).map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold"
                >
                  <span className="truncate max-w-[120px]">{opt.label}</span>
                  <button
                    type="button"
                    onClick={(e) => removeTag(e, opt.value)}
                    className="p-0.5 hover:text-white rounded transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {selectedOptions.length > maxDisplayTags && (
                <span className="px-2 py-0.5 rounded-lg bg-surface text-secondary text-xs font-extrabold border border-subtle">
                  +{selectedOptions.length - maxDisplayTags} more
                </span>
              )}
            </>
          )}
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 pointer-events-none ${
            isOpen ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } left-0 right-0 z-[100] min-w-full w-full p-2 bg-surface-solid border border-subtle rounded-2xl shadow-2xl space-y-2 animate-zoom-in max-h-64 flex flex-col`}
        >
          {/* Search Box */}
          {searchable && (
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-subtle rounded-xl text-xs font-semibold text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          )}

          {/* Action Bar (Select All / Clear) */}
          <div className="flex items-center justify-between px-1 text-[11px] font-bold shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-amber-500 hover:text-amber-400 transition cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-secondary hover:text-primary transition cursor-pointer"
            >
              Clear All ({value.length})
            </button>
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted font-semibold">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                        : 'text-secondary hover:bg-surface-elevated hover:text-primary'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="truncate block">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] text-muted font-normal block truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'border-subtle bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="text-[11px] font-bold text-rose-400 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect';

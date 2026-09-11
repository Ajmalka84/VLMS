import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  labelRight?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = React.memo(({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  labelRight,
  searchable = true,
  searchPlaceholder = 'Search...',
  required = false,
  disabled = false,
  fullWidth = true,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openDirection: 'down' | 'up';
  } | null>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, 220);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - minWidth - 8));

    setDropdownPosition({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left,
      width: minWidth,
      openDirection: openUp ? 'up' : 'down',
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        // Compute position on open
        requestAnimationFrame(updatePosition);
      }
      return next;
    });
  }, [disabled, updatePosition]);

  // Keep dropdown aligned on scroll or window resize
  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null);
      return;
    }

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, search]);

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Portal Dropdown Element
  const dropdownMenu = isOpen && dropdownPosition ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        top: dropdownPosition.openDirection === 'down' ? `${dropdownPosition.top}px` : undefined,
        bottom:
          dropdownPosition.openDirection === 'up'
            ? `${window.innerHeight - dropdownPosition.top}px`
            : undefined,
        zIndex: 999999,
      }}
      className="rounded-2xl bg-surface-solid border border-subtle shadow-2xl overflow-hidden animate-fade-in"
    >
      {/* Search Bar inside dropdown */}
      {searchable && options.length > 5 && (
        <div className="p-2.5 border-b border-subtle bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-surface-solid border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-amber-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted font-medium">
            No matching options found
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'hover:bg-surface-elevated text-secondary hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  {opt.icon && (
                    <span className={isSelected ? 'text-slate-950' : 'text-muted'}>
                      {opt.icon}
                    </span>
                  )}
                  <div className="truncate">
                    <div
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isSelected ? 'text-slate-950 font-bold' : 'text-primary'
                      }`}
                    >
                      {opt.label}
                    </div>
                    {opt.subLabel && (
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-slate-900 font-medium' : 'text-muted'
                        }`}
                      >
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-slate-950 shrink-0 mr-1" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full flex-1 min-w-0' : ''} ${className}`}
    >
      {(label || labelRight) && (
        <div className="flex items-center justify-between mb-1.5 gap-2">
          {label && (
            <label
              htmlFor={selectId}
              className="block text-xs font-bold text-secondary uppercase tracking-wider select-none"
            >
              {label} {required && <span className="text-amber-500">*</span>}
            </label>
          )}
          {labelRight && <div className="shrink-0">{labelRight}</div>}
        </div>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full h-[46px] min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-surface-solid border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none touch-manipulation ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
            : 'border-subtle hover:border-slate-400 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1 pointer-events-none">
          {selectedOption?.icon && (
            <div className="text-amber-500 shrink-0">{selectedOption.icon}</div>
          )}
          {selectedOption ? (
            <span className="text-xs sm:text-sm font-semibold text-primary truncate block">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-muted font-medium truncate block">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform shrink-0 pointer-events-none ${
            isOpen ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Mounted in Document Body via React Portal */}
      {typeof document !== 'undefined' && dropdownMenu && createPortal(dropdownMenu, document.body)}
    </div>
  );
});

CustomSelect.displayName = 'CustomSelect';

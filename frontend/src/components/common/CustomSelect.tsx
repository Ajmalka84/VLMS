import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
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
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
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

  return (
    <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} ref={containerRef}>
      {(label || labelRight) && (
        <div className="flex items-center justify-between mb-1.5 gap-2">
          {label && (
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              {label} {required && <span className="text-amber-400">*</span>}
            </label>
          )}
          {labelRight && <div className="shrink-0">{labelRight}</div>}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[46px] min-h-[46px] px-3.5 py-2.5 rounded-2xl bg-slate-900 border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none touch-manipulation ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
            : 'border-slate-800 hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1 pointer-events-none">
          {selectedOption?.icon && (
            <div className="text-amber-400 shrink-0">{selectedOption.icon}</div>
          )}
          {selectedOption ? (
            <span className="text-xs sm:text-sm font-semibold text-white truncate block">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-slate-500 font-medium truncate block">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 pointer-events-none ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/90 overflow-hidden animate-fade-in">
          {/* Search Bar inside dropdown */}
          {searchable && options.length > 5 && (
            <div className="p-2.5 border-b border-slate-800 bg-slate-950/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
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
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      {opt.icon && (
                        <span className={isSelected ? 'text-slate-950' : 'text-slate-400'}>
                          {opt.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <div
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isSelected ? 'text-slate-950 font-bold' : 'text-white'
                          }`}
                        >
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'
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
      )}
    </div>
  );
};

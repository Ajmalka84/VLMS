import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

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
  placeholder?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m <= 11) {
      const monthShort = MONTH_NAMES[m].slice(0, 3);
      return `${String(d).padStart(2, '0')} ${monthShort} ${y}`;
    }
  }
  return dateStr;
}

function toIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DateInput: React.FC<DateInputProps> = React.memo(({
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
  placeholder = 'Select date',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial view from value or fallback to today
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
      return { year: y, month: m - 1, day: d };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  // Sync view when value or popover opens
  useEffect(() => {
    if (isOpen) {
      setViewYear(initialDate.year);
      setViewMonth(initialDate.month);
    }
  }, [isOpen, initialDate]);

  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openDirection: 'down' | 'up';
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = 330;
    const popoverWidth = Math.max(rect.width, 280);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));

    setPopoverPosition({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left,
      width: popoverWidth,
      openDirection: openUp ? 'up' : 'down',
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(updatePosition);
      }
      return next;
    });
  }, [disabled, updatePosition]);

  // Keep popover aligned on scroll or window resize
  useEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
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

  // Close popover on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (isoDate: string) => {
    onChange(isoDate);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
    onChange(todayIso);
    setIsOpen(false);
  };

  // Calendar Day Grid Computation
  const calendarDays = useMemo(() => {
    const today = new Date();
    const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      isoDate: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    // Trailing days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = toIsoDate(prevY, prevM, d);
      days.push({
        isoDate: iso,
        dayNum: d,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === value,
        isDisabled: (min ? iso < min : false) || (max ? iso > max : false),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(viewYear, viewMonth, d);
      days.push({
        isoDate: iso,
        dayNum: d,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        isSelected: iso === value,
        isDisabled: (min ? iso < min : false) || (max ? iso > max : false),
      });
    }

    // Next month leading days to complete grid
    const totalSlots = days.length % 7 === 0 ? days.length : days.length + (7 - (days.length % 7));
    const nextNeeded = Math.max(35, totalSlots) - days.length;

    for (let d = 1; d <= nextNeeded; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = toIsoDate(nextY, nextM, d);
      days.push({
        isoDate: iso,
        dayNum: d,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        isSelected: iso === value,
        isDisabled: (min ? iso < min : false) || (max ? iso > max : false),
      });
    }

    return days;
  }, [viewYear, viewMonth, value, min, max]);

  const dateInputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'date-input');

  // Calendar Popover Element rendered via Portal
  const calendarPopover = isOpen && popoverPosition ? (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: `${popoverPosition.left}px`,
        width: `${popoverPosition.width}px`,
        top: popoverPosition.openDirection === 'down' ? `${popoverPosition.top}px` : undefined,
        bottom:
          popoverPosition.openDirection === 'up'
            ? `${window.innerHeight - popoverPosition.top}px`
            : undefined,
        zIndex: 999999,
      }}
      className="rounded-2xl bg-surface-solid border border-subtle shadow-2xl p-3.5 animate-fade-in select-none"
    >
      {/* Popover Header: Month & Year Navigator */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-subtle">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs sm:text-sm font-bold text-primary tracking-wide">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-elevated transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_NAMES.map((w) => (
          <span key={w} className="text-[10px] font-bold uppercase text-muted py-1">
            {w}
          </span>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((d, idx) => (
          <button
            key={`${d.isoDate}-${idx}`}
            type="button"
            disabled={d.isDisabled}
            onClick={() => handleSelectDate(d.isoDate)}
            className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              d.isDisabled
                ? 'opacity-20 cursor-not-allowed text-muted'
                : d.isSelected
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                : d.isToday
                ? 'bg-surface text-amber-500 font-bold border border-amber-500/40 hover:bg-surface-elevated'
                : d.isCurrentMonth
                ? 'text-primary hover:bg-surface-elevated'
                : 'text-muted/50 hover:bg-surface-elevated hover:text-secondary'
            }`}
          >
            {d.dayNum}
          </button>
        ))}
      </div>

      {/* Popover Footer: Quick Actions */}
      <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleSelectToday}
          className="text-amber-500 hover:text-amber-400 font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" /> Today
        </button>

        {clearable && value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setIsOpen(false);
            }}
            className="text-secondary hover:text-rose-500 transition font-medium cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`${fullWidth ? 'w-full flex-1 min-w-0' : ''} space-y-1.5 ${containerClassName}`}
    >
      {label && (
        <label
          htmlFor={dateInputId}
          className="text-xs font-semibold text-secondary block select-none"
        >
          {label}
        </label>
      )}

      {/* Clickable Date Trigger Button */}
      <div
        id={dateInputId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`relative flex items-center w-full h-[46px] min-h-[46px] bg-surface-solid border rounded-2xl pl-10 ${
          clearable && value ? 'pr-11' : 'pr-4'
        } py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 outline-none select-none cursor-pointer group touch-manipulation ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
            : error
            ? 'border-rose-500/80 shadow-sm shadow-rose-950/50'
            : 'border-subtle hover:border-slate-400 dark:hover:border-slate-700'
        } ${className}`}
      >
        <div className="absolute left-3.5 flex items-center justify-center text-muted group-hover:text-amber-500 transition-colors pointer-events-none">
          <Calendar className="w-4 h-4 text-amber-500" />
        </div>

        {value ? (
          <span className="text-primary font-bold tracking-tight">
            {formatDisplayDate(value)}
            <span className="text-muted text-[11px] font-normal ml-2 hidden sm:inline">
              ({value})
            </span>
          </span>
        ) : (
          <span className="text-muted font-medium">{placeholder}</span>
        )}

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            aria-label="Clear date"
            className="absolute right-3 p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition cursor-pointer z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Popover Mounted to Document Body */}
      {typeof document !== 'undefined' && calendarPopover && createPortal(calendarPopover, document.body)}

      {error ? (
        <p className="text-[11px] font-bold text-rose-400 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

DateInput.displayName = 'DateInput';

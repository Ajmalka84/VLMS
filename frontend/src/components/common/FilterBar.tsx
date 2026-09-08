import React from 'react';
import { Calendar, Search, Download, Layers } from 'lucide-react';
import { DatePreset } from '../../hooks/useFilterState';
import { useLanguage } from '../../context/LanguageContext';
import { DateInput } from './DateInput';

export interface FilterBarProps {
  presets?: DatePreset[];
  activePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  onExportCSV?: () => void;
  exportLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_PRESETS: DatePreset[] = ['all', 'today', 'yesterday', 'week', 'month', 'custom'];

export const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({
    presets = DEFAULT_PRESETS,
    activePreset,
    onPresetChange,
    startDate = '',
    onStartDateChange,
    endDate = '',
    onEndDateChange,
    search,
    onSearchChange,
    searchPlaceholder = 'Search records...',
    onExportCSV,
    exportLabel = 'Export CSV',
    children,
    className = '',
  }) => {
    const { t, language } = useLanguage();

    const getPresetLabel = (preset: DatePreset): string => {
      switch (preset) {
        case 'all':
          return t('all_time');
        case 'today':
          return t('today');
        case 'yesterday':
          return t('yesterday');
        case 'week':
          return t('last_7_days');
        case 'month':
          return t('this_month');
        case 'custom':
          return t('custom_range');
      }
    };

    return (
      <div
        className={`p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 relative z-30 shadow-xl ${className}`}
      >
        {/* Top Preset Buttons & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> {t('period')}:
            </span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPresetChange(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none touch-manipulation whitespace-nowrap ${
                  activePreset === p
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {getPresetLabel(p)}
              </button>
            ))}
          </div>

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exportLabel}</span>
            </button>
          )}
        </div>

        {/* Custom Date Bounds Picker (if preset === 'custom') */}
        {activePreset === 'custom' && onStartDateChange && onEndDateChange && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex-1 min-w-[160px]">
              <DateInput
                label={language === 'ml' ? 'മുതൽ (From)' : 'From Date'}
                value={startDate}
                onChange={onStartDateChange}
                clearable={false}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <DateInput
                label={language === 'ml' ? 'വരെ (To)' : 'To Date'}
                value={endDate}
                onChange={onEndDateChange}
                clearable={false}
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  onStartDateChange('');
                  onEndDateChange('');
                  onPresetChange('all');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer self-end mb-2.5"
              >
                {language === 'ml' ? 'മായ്ക്കുക' : 'Clear Range'}
              </button>
            )}
          </div>
        )}


        {/* Search Bar + Dynamic Children Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 items-center">
          {onSearchChange && (
            <div className="relative sm:col-span-2 md:col-span-1 lg:col-span-2 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-[46px] pl-10 pr-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }
);

FilterBar.displayName = 'FilterBar';


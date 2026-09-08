import { useState, useCallback, startTransition } from 'react';
import { useDebounce } from './useDebounce';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface UseFilterStateOptions {
  defaultPreset?: DatePreset;
  debounceMs?: number;
}

export function useFilterState(options: UseFilterStateOptions = {}) {
  const { defaultPreset = 'all', debounceMs = 150 } = options;

  const [preset, setPresetState] = useState<DatePreset>(defaultPreset);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, debounceMs);
  const [page, setPage] = useState(1);

  // Custom date bounds
  const [startDate, setStartDate] = useState<string>(() => {
    if (defaultPreset === 'today') return new Date().toISOString().split('T')[0];
    return '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (defaultPreset === 'today') return new Date().toISOString().split('T')[0];
    return '';
  });

  const setPreset = useCallback((newPreset: DatePreset) => {
    startTransition(() => {
      setPresetState(newPreset);
      setPage(1);
      const now = new Date();

      if (newPreset === 'all') {
        setStartDate('');
        setEndDate('');
      } else if (newPreset === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        setStartDate(todayStr);
        setEndDate(todayStr);
      } else if (newPreset === 'yesterday') {
        const yesterday = new Date(now.getTime() - 86400000);
        const yestStr = yesterday.toISOString().split('T')[0];
        setStartDate(yestStr);
        setEndDate(yestStr);
      } else if (newPreset === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
        setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
      } else if (newPreset === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
      }
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    startTransition(() => {
      setPreset(defaultPreset);
      setPage(1);
    });
  }, [defaultPreset, setPreset]);

  return {
    preset,
    setPreset,
    search,
    setSearch,
    debouncedSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    setPage,
    resetFilters,
  };
}

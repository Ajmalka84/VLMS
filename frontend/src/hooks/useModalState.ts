import { useState, useCallback } from 'react';

export function useModalState<M extends string = string, T = any>() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<M | null>(null);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((modalMode: M, modalData?: T | null) => {
    setMode(modalMode);
    setData(modalData ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setMode(null);
    setData(null);
  }, []);

  return {
    isOpen,
    mode,
    data,
    open,
    close,
  };
}

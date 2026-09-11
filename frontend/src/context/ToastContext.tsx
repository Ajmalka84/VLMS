import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastToastRef = React.useRef<{ message: string; timestamp: number }>({
    message: '',
    timestamp: 0,
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 2200) => {
      if (!message) return;

      // Suppress duplicate toasts within 1.5s window
      const now = Date.now();
      if (
        lastToastRef.current.message === message &&
        now - lastToastRef.current.timestamp < 1500
      ) {
        return;
      }
      lastToastRef.current = { message, timestamp: now };

      const id = `${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, type, message, duration };

      // Haptic feedback on mobile if supported
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          if (type === 'error') navigator.vibrate([100, 50, 100]);
          else navigator.vibrate(50);
        } catch {
          // Ignore
        }
      }

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, d?: number) => showToast('success', msg, d), [showToast]);
  const error = useCallback((msg: string, d?: number) => showToast('error', msg, d), [showToast]);
  const warning = useCallback((msg: string, d?: number) => showToast('warning', msg, d), [showToast]);
  const info = useCallback((msg: string, d?: number) => showToast('info', msg, d), [showToast]);

  const value = React.useMemo(
    () => ({ showToast, success, error, warning, info }),
    [showToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Fixed Floating Toast Container */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 transition-all transform animate-slide-down ${
              t.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-100 shadow-emerald-950/20'
                : t.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-100 shadow-rose-950/20'
                : t.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-100 shadow-amber-950/20'
                : 'bg-white dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-slate-950/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              </div>
              <span className="text-xs sm:text-sm font-bold leading-snug break-words">
                {t.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-secondary hover:text-primary shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

import React from 'react';
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: 'up' | 'down' | 'loading' | 'ok' | 'error';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const isOk = status === 'ok' || status === 'up';
  const isLoading = status === 'loading';

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}
      >
        <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
        {label ?? 'Checking'}
      </span>
    );
  }

  if (isOk) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        {label ?? 'Online'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      <AlertCircle className="w-3 h-3 text-rose-400" />
      {label ?? 'Offline'}
    </span>
  );
};

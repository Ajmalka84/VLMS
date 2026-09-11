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
        className={`inline-flex items-center gap-1.5 rounded-full font-medium badge-slate ${sizeClasses}`}
      >
        <RefreshCw className="w-3 h-3 animate-spin text-muted" />
        {label ?? 'Checking'}
      </span>
    );
  }

  if (isOk) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium badge-emerald ${sizeClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        {label ?? 'Online'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium badge-rose ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      <AlertCircle className="w-3 h-3 text-rose-500" />
      {label ?? 'Offline'}
    </span>
  );
};

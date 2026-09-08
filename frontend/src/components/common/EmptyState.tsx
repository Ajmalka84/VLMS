import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState = React.memo<EmptyStateProps>(({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col items-center justify-center space-y-4 animate-fade-in ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 shadow-inner">
        {icon || <Layers className="w-7 h-7 text-amber-500/80" />}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onAction}
            leftIcon={actionIcon}
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  siteBadge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = React.memo(
  ({ title, subtitle, icon, badge, siteBadge, actions, className = '' }) => {
    const displayBadge = badge || siteBadge;

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            {icon && (
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                {icon}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {title}
            </h1>
            {displayBadge && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shrink-0">
                {displayBadge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {actions && <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">{actions}</div>}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

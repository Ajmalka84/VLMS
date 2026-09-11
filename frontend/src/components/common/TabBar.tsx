import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  buttonId?: string;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export const TabBar = React.memo<TabBarProps>(({
  tabs,
  activeTab,
  onChange,
  className = '',
  ariaLabel = 'Navigation Tabs',
}) => {
  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface border border-subtle overflow-x-auto scrollbar-none select-none ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={tab.buttonId || `tab-${tab.id}`}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation min-h-[38px] active:scale-[0.98] ${
              isActive
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-secondary hover:text-primary hover:bg-surface-elevated'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-secondary'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-slate-950/30 text-slate-950'
                    : 'bg-surface-elevated text-secondary'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

TabBar.displayName = 'TabBar';

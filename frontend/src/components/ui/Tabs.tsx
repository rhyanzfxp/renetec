import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={clsx('flex items-center gap-1 border-b border-surface-border overflow-x-auto no-scrollbar', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px outline-none',
              isActive
                ? 'border-brand-500 text-white bg-brand-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-surface-border'
            )}
          >
            {tab.icon && <span className={clsx(isActive ? 'text-brand-400' : 'text-gray-400')}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                  isActive
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                    : 'bg-surface-elevated text-gray-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

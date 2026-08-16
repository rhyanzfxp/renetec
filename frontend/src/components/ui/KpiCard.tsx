import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'border-surface-border text-white',
    success: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/10',
    warning: 'border-amber-500/30 text-amber-400 bg-amber-950/10',
    danger: 'border-red-500/30 text-red-400 bg-red-950/10',
    info: 'border-sky-500/30 text-sky-400 bg-sky-950/10',
  };

  const textColors = {
    default: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-sky-400',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'p-4 rounded-xl bg-surface-card border transition-all duration-150 relative overflow-hidden',
          variantStyles[variant],
          className
        )
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 truncate">
          {label}
        </span>
        {icon && <div className="text-gray-400 flex-shrink-0">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={clsx('text-2xl sm:text-3xl font-bold tracking-tight tabular-nums', textColors[variant])}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-gray-400">{unit}</span>}
      </div>

      {subtext && <p className="mt-1 text-xs text-gray-400 truncate">{subtext}</p>}
    </div>
  );
};

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
  className,
}: TableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={twMerge('w-full overflow-x-auto rounded-lg border border-surface-border bg-surface-card', className)}>
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-elevated/80 text-gray-300 font-semibold tracking-wider uppercase text-[11px]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx('py-2.5 px-3 sm:px-4', alignClasses[col.align || 'left'])}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60">
          {isLoading ? (
            // Skeleton Loader Rows
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-3 sm:px-4">
                    <div className="h-4 bg-surface-elevated rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="py-8 px-4 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Inbox className="w-8 h-8 text-gray-500 stroke-1" />
                  <p className="text-sm font-medium text-gray-300">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                className={clsx(
                  'transition-colors duration-100 group',
                  onRowClick
                    ? 'cursor-pointer hover:bg-surface-elevated/60 active:bg-surface-elevated'
                    : 'hover:bg-surface-elevated/30'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx('py-2.5 px-3 sm:px-4 text-gray-200', alignClasses[col.align || 'left'])}
                  >
                    {col.render ? col.render(row, index) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

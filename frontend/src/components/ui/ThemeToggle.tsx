import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../features/theme/ThemeContext';
import { clsx } from 'clsx';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      role="switch"
      aria-checked={isDark}
      aria-label={`Alternar para ${isDark ? 'Modo Claro' : 'Modo Escuro'}`}
      title={`Alternar para ${isDark ? 'Modo Claro' : 'Modo Escuro'}`}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      tabIndex={0}
      className={clsx(
        'relative inline-flex items-center h-8 w-[68px] p-0.5 rounded-full cursor-pointer select-none',
        'bg-surface-elevated border border-surface-border',
        'transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:ring-offset-surface-base',
        'hover:border-surface-muted active:scale-95',
        className
      )}
    >
      {/* Indicador deslizante (Pill Knob) */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute top-0.5 bottom-0.5 w-[30px] rounded-full shadow-sm',
          'transition-transform duration-200 ease-out',
          'bg-surface-card border border-surface-border/80',
          isDark ? 'translate-x-[34px]' : 'translate-x-0'
        )}
      />

      {/* Ícone Sol (Modo Claro) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setTheme('light');
        }}
        className={clsx(
          'relative z-10 w-[30px] h-full flex items-center justify-center rounded-full transition-colors duration-200',
          !isDark ? 'text-amber-500' : 'text-gray-400 hover:text-gray-300'
        )}
      >
        <Sun className={clsx('w-3.5 h-3.5 transition-transform duration-200', !isDark && 'scale-110')} />
      </button>

      {/* Ícone Lua (Modo Escuro) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          setTheme('dark');
        }}
        className={clsx(
          'relative z-10 w-[30px] h-full flex items-center justify-center rounded-full transition-colors duration-200',
          isDark ? 'text-brand-400' : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <Moon className={clsx('w-3.5 h-3.5 transition-transform duration-200', isDark && 'scale-110')} />
      </button>
    </div>
  );
};

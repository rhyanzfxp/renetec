import React, { type ButtonHTMLAttributes, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** @deprecated Use loading instead */
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Mostra um ✓ verde por 1.2s após o clique para dar feedback instantâneo de sucesso */
  successFeedback?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      successFeedback = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const [showSuccess, setShowSuccess] = useState(false);
    const isActive = loading || isLoading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (successFeedback && !isActive) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1200);
      }
      onClick?.(e);
    };

    const baseStyles =
      'inline-flex items-center justify-center font-semibold ' +
      'transition-all duration-100 ease-out ' +
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-base ' +
      'disabled:opacity-50 disabled:cursor-not-allowed select-none ' +
      'active:scale-[0.95] hover:scale-[1.02] ' +  // Microanimação de press e hover instantâneos
      'active:transition-none will-change-transform'; // Elimina delay no active

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5 h-8',
      md: 'text-sm px-4 py-2 rounded-lg gap-2 h-10',
      lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 h-12',
    };

    const variants = {
      primary:
        'bg-brand-600 hover:bg-brand-500 text-white shadow-sm hover:shadow-glow-primary border border-brand-500/30',
      secondary:
        'bg-surface-elevated hover:bg-surface-border text-gray-200 border border-surface-border',
      success:
        'bg-status-aprovado hover:bg-emerald-600 text-white border border-emerald-500/40 shadow-sm',
      danger:
        'bg-status-reprovado hover:bg-red-600 text-white border border-red-500/40 shadow-sm',
      warning:
        'bg-status-retrabalho hover:bg-amber-500 text-slate-950 font-bold border border-amber-500/40 shadow-sm',
      outline:
        'bg-transparent hover:bg-surface-elevated text-gray-300 border border-surface-border hover:text-white',
      ghost:
        'bg-transparent hover:bg-surface-elevated text-gray-400 hover:text-gray-200 border border-transparent',
    };

    const renderContent = () => {
      if (isActive) {
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" />
            <span>Processando...</span>
          </>
        );
      }
      if (showSuccess) {
        return (
          <>
            <CheckCircle2 className="w-4 h-4 text-current flex-shrink-0 animate-scaleIn" />
            <span>Pronto!</span>
          </>
        );
      }
      return (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      );
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isActive}
        className={twMerge(clsx(baseStyles, sizes[size], variants[variant], className))}
        onClick={handleClick}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';

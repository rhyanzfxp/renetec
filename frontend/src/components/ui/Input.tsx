import React, { type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, helperText, leftIcon, rightIcon, rightAction, className, id, type, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    // ─── Campos numéricos: trocar type="number" por text+inputMode para permitir
    //     apagar todos os dígitos sem o browser bloquear ou forçar um valor mínimo.
    const isNumeric = type === 'number';
    const resolvedType = isNumeric ? 'text' : (type ?? 'text');
    const resolvedInputMode = isNumeric ? 'numeric' : undefined;
    const resolvedPattern = isNumeric ? '[0-9]*' : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-gray-300 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative rounded-lg">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            inputMode={resolvedInputMode}
            pattern={resolvedPattern}
            autoComplete={isNumeric ? 'off' : undefined}
            className={twMerge(
              clsx(
                'w-full bg-surface-card border rounded-lg text-sm text-gray-100 placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:bg-surface-base disabled:cursor-not-allowed',
                // Remover as setas/spinners nativos do browser para campos numéricos
                isNumeric && '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                'h-10 px-3',
                leftIcon && 'pl-10',
                (rightIcon || rightAction) && 'pr-10',
                error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-surface-border'
              ),
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
          {rightAction && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
              {rightAction}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-400 font-medium flex items-center gap-1 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-400 mt-1">{helperText}</p>
        ) : hint ? (
          <p className="text-xs text-gray-400 mt-1">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

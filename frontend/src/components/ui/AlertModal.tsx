import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string | null;
  type?: 'error' | 'warning' | 'info' | 'success';
  buttonText?: string;
  detalhes?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  buttonText = 'Entendi',
  detalhes,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Pequeno timeout para garantir renderização antes de focar
      const t = setTimeout(() => {
        buttonRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Enter')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const defaultTitle =
    title ||
    (type === 'error'
      ? 'Não foi possível registrar'
      : type === 'warning'
      ? 'Atenção'
      : type === 'success'
      ? 'Sucesso'
      : 'Informação');

  const config = {
    error: {
      border: 'border-red-500/50',
      bgGlow: 'shadow-[0_0_50px_rgba(239,68,68,0.25)]',
      iconBg: 'bg-red-500/15 text-red-500 border border-red-500/30',
      icon: <AlertCircle className="w-8 h-8" />,
      btnVariant: 'danger' as const,
      accentText: 'text-red-400',
    },
    warning: {
      border: 'border-amber-500/50',
      bgGlow: 'shadow-[0_0_50px_rgba(245,158,11,0.25)]',
      iconBg: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
      icon: <AlertTriangle className="w-8 h-8" />,
      btnVariant: 'warning' as const,
      accentText: 'text-amber-400',
    },
    info: {
      border: 'border-sky-500/50',
      bgGlow: 'shadow-[0_0_50px_rgba(14,165,233,0.25)]',
      iconBg: 'bg-sky-500/15 text-sky-500 border border-sky-500/30',
      icon: <Info className="w-8 h-8" />,
      btnVariant: 'primary' as const,
      accentText: 'text-sky-400',
    },
    success: {
      border: 'border-emerald-500/50',
      bgGlow: 'shadow-[0_0_50px_rgba(16,185,129,0.25)]',
      iconBg: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
      icon: <CheckCircle2 className="w-8 h-8" />,
      btnVariant: 'success' as const,
      accentText: 'text-emerald-400',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop escuro com desfoque */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Pop-up Dialog Centralizado */}
      <div
        className={`relative w-full max-w-md bg-surface-card border ${config.border} ${config.bgGlow} rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200`}
        role="alertdialog"
        aria-modal="true"
      >
        {/* Top Header com Botão Fechar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${config.iconBg} shrink-0`}>
              {config.icon}
            </div>
            <div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${config.accentText}`}>
                Aviso do Sistema
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                {defaultTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-surface-elevated transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com a Mensagem de Erro/Alerta em Destaque */}
        <div className="px-6 py-4">
          <div className="p-4 rounded-xl bg-surface-base/90 border border-surface-border text-sm text-gray-200 font-medium leading-relaxed">
            {message}
          </div>

          {detalhes && (
            <p className="mt-2.5 text-xs text-gray-400 leading-normal px-1">
              {detalhes}
            </p>
          )}
        </div>

        {/* Rodapé com botão de ação visível */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-end gap-3 bg-surface-card border-t border-surface-border/40">
          <Button
            ref={buttonRef}
            variant={config.btnVariant}
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto font-bold px-6 shadow-md"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

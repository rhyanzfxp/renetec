import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-md',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Animação CSS manual: mais rápida e sem dependência de plugin Tailwind animate-in
  useEffect(() => {
    if (!panelRef.current) return;
    if (isOpen) {
      // Slide-in instantâneo da direita
      panelRef.current.style.transform = 'translateX(100%)';
      panelRef.current.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!panelRef.current) return;
          panelRef.current.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease-out';
          panelRef.current.style.transform = 'translateX(0)';
          panelRef.current.style.opacity = '1';
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop — fade-in instantâneo */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        style={{ animationDuration: '150ms' }}
      />

      {/* Panel — slide-in da direita com GPU transform */}
      <div
        ref={panelRef}
        className={clsx(
          'relative w-full bg-surface-card border-l border-surface-border shadow-2xl flex flex-col z-10 will-change-transform',
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-elevated/40">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — rolagem suave */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>

        {/* Footer fixo */}
        {footer && (
          <div className="px-6 py-4 border-t border-surface-border bg-surface-elevated/30 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

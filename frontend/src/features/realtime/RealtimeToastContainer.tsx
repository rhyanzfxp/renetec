import React from 'react';
import { useRealtime } from './RealtimeContext';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export const RealtimeToastContainer: React.FC = () => {
  const { toasts, removeToast } = useRealtime();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getBorderAndBg = () => {
          if (toast.type === 'success') {
            return 'bg-surface-card/95 border-emerald-500/40 text-emerald-300 shadow-glow-primary';
          }
          if (toast.type === 'warning') {
            return 'bg-surface-card/95 border-amber-500/40 text-amber-300';
          }
          if (toast.type === 'danger') {
            return 'bg-surface-card/95 border-red-500/40 text-red-300';
          }
          return 'bg-surface-card/95 border-brand-500/40 text-brand-300';
        };

        const getIcon = () => {
          if (toast.type === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
          if (toast.type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
          return <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />;
        };

        return (
          <div
            key={toast.id}
            className={`p-3.5 rounded-xl border shadow-2xl backdrop-blur-md pointer-events-auto flex items-start justify-between gap-3 animate-fadeIn transition-all ${getBorderAndBg()}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{getIcon()}</div>
              <div>
                <h4 className="text-xs font-bold text-white">{toast.title}</h4>
                <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{toast.message}</p>
                <span className="text-[9px] text-gray-500 mt-1 block">
                  {toast.timestamp.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

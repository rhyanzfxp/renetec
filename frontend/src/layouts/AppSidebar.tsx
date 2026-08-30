import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  Wrench, 
  CheckCircle, 
  Target, 
  History, 
  BarChart2, 
  Layers,
  Tv,
  ChevronRight
} from 'lucide-react';

import { clsx } from 'clsx';
import { useAuth } from '../features/auth/AuthContext';
import { useRealtime } from '../features/realtime/RealtimeContext';
import { metaApiService } from '../features/metas/meta.service';
import type { MetaAtualData } from '../features/metas/meta.types';
import type { NavSection } from '../types/auth';

export type { NavSection };

interface AppSidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const perfil = user?.perfil || 'TECNICO';
  const { subscribe } = useRealtime();

  const [metaData, setMetaData] = useState<MetaAtualData | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const data = await metaApiService.getMetaAtual();
      if (data) {
        setMetaData(data);
      }
    } catch {
      // Falha silenciosa para não interferir na navegação
    }
  }, []);

  useEffect(() => {
    loadMeta();
    const unsubscribe = subscribe('*', () => {
      loadMeta();
    });
    return () => unsubscribe();
  }, [loadMeta, subscribe]);

  // Itens de navegação baseados no perfil do usuário
  const navItems = {
    ADMIN: [
      { id: 'dashboard' as NavSection, label: 'Dashboard Gerencial', icon: <BarChart2 className="w-4 h-4" /> },
      { id: 'tv_fabrica' as NavSection, label: 'Painel Renetec', icon: <Tv className="w-4 h-4 text-amber-400" /> },
      { id: 'ordens_servico' as NavSection, label: 'Ordens de Serviço', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'producao' as NavSection, label: 'Produção', icon: <Wrench className="w-4 h-4" /> },
      { id: 'fila_testes' as NavSection, label: 'Controle de Qualidade', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'retrabalho' as NavSection, label: 'Fila de Retrabalho', icon: <History className="w-4 h-4" /> },
      { id: 'metas' as NavSection, label: 'Metas e Produtividade', icon: <Target className="w-4 h-4" /> },
      { id: 'auditoria' as NavSection, label: 'Auditoria e Logs', icon: <Layers className="w-4 h-4" /> },
    ],
    TECNICO: [
      { id: 'producao' as NavSection, label: 'Apontamento de Produção', icon: <Wrench className="w-4 h-4" /> },
      { id: 'minhas_os' as NavSection, label: 'Minhas OS Disponíveis', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'retrabalho' as NavSection, label: 'Meus Retrabalhos', icon: <History className="w-4 h-4" /> },
      { id: 'metas' as NavSection, label: 'Meta Coletiva', icon: <Target className="w-4 h-4" /> },
      { id: 'tv_fabrica' as NavSection, label: 'Painel Renetec', icon: <Tv className="w-4 h-4 text-amber-400" /> },
    ],
    QUALIDADE: [
      { id: 'fila_testes' as NavSection, label: 'Fila de Testes (Inspeção)', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'dashboard' as NavSection, label: 'Indicadores Gerenciais', icon: <BarChart2 className="w-4 h-4" /> },
      { id: 'metas' as NavSection, label: 'Acompanhamento de Metas', icon: <Target className="w-4 h-4" /> },
      { id: 'tv_fabrica' as NavSection, label: 'Painel Renetec', icon: <Tv className="w-4 h-4 text-amber-400" /> },
    ],
  };

  const currentItems = navItems[perfil] || navItems.TECNICO;

  const pctAlvo = metaData ? Math.min(100, Math.max(0, metaData.percentualAlvo)) : 0;

  return (
    <>
      {/* Backdrop para mobile ou quando em modo TV */}
      {isOpen && (
        <div
          className={clsx(
            'fixed inset-0 bg-black/70 backdrop-blur-xs z-40',
            activeSection === 'tv_fabrica' ? 'block' : 'lg:hidden'
          )}
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'top-0 bottom-0 left-0 z-50 w-64 bg-surface-card border-r border-surface-border flex flex-col transition-transform duration-200 ease-in-out',
          activeSection === 'tv_fabrica'
            ? clsx('fixed', isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full')
            : clsx('fixed lg:static', isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        )}
      >
        {/* Navigation list */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Navegação Operacional
          </div>

          {currentItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors select-none group',
                  isActive
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated/60 border border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={clsx(isActive ? 'text-brand-400' : 'text-gray-400 group-hover:text-gray-300')}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                <ChevronRight
                  className={clsx(
                    'w-3.5 h-3.5 transition-transform',
                    isActive ? 'text-brand-400 translate-x-0.5' : 'text-gray-600 opacity-0 group-hover:opacity-100'
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Mini Widget da Meta Coletiva Dinâmico no Rodapé da Sidebar */}
        <div className="p-3 border-t border-surface-border bg-surface-base/40 m-2 rounded-xl border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" /> Meta Alvo
            </span>
            <span className="font-bold text-emerald-400 tabular-nums">
              {metaData ? `${metaData.percentualAlvo}%` : '0.0%'}
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pctAlvo}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5 tabular-nums">
            <span>{metaData ? `${metaData.pontosRealizados} pts` : '0 pts'}</span>
            <span>Alvo: {metaData?.metaAlvo ?? 300} pts</span>
          </div>
        </div>
      </aside>
    </>
  );
};

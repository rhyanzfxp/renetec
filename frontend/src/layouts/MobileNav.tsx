import React from 'react';
import { ClipboardList, Wrench, CheckCircle, Target, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../features/auth/AuthContext';
import type { NavSection } from '../types/auth';

interface MobileNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeSection, onSelectSection }) => {
  const { user } = useAuth();
  const perfil = user?.perfil || 'TECNICO';

  const itemsByRole = {
    ADMIN: [
      { id: 'dashboard' as NavSection, label: 'Painel', icon: <BarChart2 className="w-5 h-5" /> },
      { id: 'ordens_servico' as NavSection, label: 'OS', icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'producao' as NavSection, label: 'Produção', icon: <Wrench className="w-5 h-5" /> },
      { id: 'fila_testes' as NavSection, label: 'Testes', icon: <CheckCircle className="w-5 h-5" /> },
      { id: 'metas' as NavSection, label: 'Metas', icon: <Target className="w-5 h-5" /> },
    ],
    TECNICO: [
      { id: 'producao' as NavSection, label: 'Produção', icon: <Wrench className="w-5 h-5" /> },
      { id: 'retrabalho' as NavSection, label: 'Retrabalho', icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'minhas_os' as NavSection, label: 'Minhas OS', icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'metas' as NavSection, label: 'Meta', icon: <Target className="w-5 h-5" /> },
    ],

    QUALIDADE: [
      { id: 'fila_testes' as NavSection, label: 'Fila CQ', icon: <CheckCircle className="w-5 h-5" /> },
      { id: 'retrabalho' as NavSection, label: 'Retrabalho', icon: <Wrench className="w-5 h-5" /> },
      { id: 'metas' as NavSection, label: 'Metas', icon: <Target className="w-5 h-5" /> },
    ],
  };

  const items = itemsByRole[perfil] || itemsByRole.TECNICO;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-surface-border px-2 py-1 flex items-center justify-around">
      {items.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectSection(item.id)}
            className={clsx(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-lg text-[10px] font-medium transition-colors select-none',
              isActive
                ? 'text-brand-400 bg-brand-500/10 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            {item.icon}
            <span className="mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

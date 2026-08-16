import React from 'react';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { StatusBadge } from '../components/ui/StatusBadge';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-surface-border bg-surface-card/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Lado Esquerdo: Logo Renetec + Texto Oficial */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-brand-500/40 shadow-glow-primary bg-[#050b2c] p-0.5 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Logo Renetec"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-wider text-white leading-none italic font-sans">
              RENETEC
            </span>
            <span className="text-[8.5px] sm:text-[9px] font-bold text-gray-300 tracking-[0.16em] uppercase mt-1 leading-none italic font-sans">
              SERVIÇOS E TECNOLOGIA
            </span>
          </div>
        </div>
      </div>

      {/* Lado Direito: Informações do Usuário e Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{user.nome}</p>
              <div className="mt-0.5">
                <StatusBadge perfil={user.perfil} size="sm" />
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center text-gray-300">
              <UserIcon className="w-4 h-4" />
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sair do Sistema"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

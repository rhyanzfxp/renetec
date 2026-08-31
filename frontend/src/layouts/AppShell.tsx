import React, { useState, lazy, Suspense } from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import type { NavSection } from '../types/auth';
import { useAuth } from '../features/auth/AuthContext';
import { StatusBadge } from '../components/ui/StatusBadge';

// Lazy loading de todos os módulos: só carrega quando o usuário acessar pela primeira vez
const OsListPage = lazy(() => import('../features/os/OsListPage').then(m => ({ default: m.OsListPage })));
const ProducaoPage = lazy(() => import('../features/producao/ProducaoPage').then(m => ({ default: m.ProducaoPage })));
const QualidadePage = lazy(() => import('../features/qualidade/QualidadePage').then(m => ({ default: m.QualidadePage })));
const RetrabalhoPage = lazy(() => import('../features/retrabalho/RetrabalhoPage').then(m => ({ default: m.RetrabalhoPage })));
const MetasPage = lazy(() => import('../features/metas/MetasPage').then(m => ({ default: m.MetasPage })));
const TvFabricaPage = lazy(() => import('../features/dashboard/TvFabricaPage').then(m => ({ default: m.TvFabricaPage })));
const DashboardGerencialPage = lazy(() => import('../features/dashboard/DashboardGerencialPage').then(m => ({ default: m.DashboardGerencialPage })));
const AuditoriaPage = lazy(() => import('../features/auditoria/AuditoriaPage').then(m => ({ default: m.AuditoriaPage })));

// Skeleton minimalista de carregamento de página
const PageSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(n => (
        <div key={n} className="h-24 rounded-xl bg-surface-card border border-surface-border" />
      ))}
    </div>
    <div className="h-64 rounded-xl bg-surface-card border border-surface-border" />
    <div className="h-40 rounded-xl bg-surface-card border border-surface-border" />
  </div>
);



export const AppShell: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>(() => {
    if (user?.perfil === 'TECNICO') return 'producao';
    if (user?.perfil === 'QUALIDADE') return 'fila_testes';
    return 'dashboard';
  });

  // Garante que a seção ativa respeita as permissões do perfil atual
  React.useEffect(() => {
    if (!user) return;
    if (user.perfil === 'QUALIDADE' && (activeSection === 'producao' || activeSection === 'minhas_os' || activeSection === 'retrabalho')) {
      setActiveSection('fila_testes');
    } else if (user.perfil === 'TECNICO' && (activeSection === 'fila_testes' || activeSection === 'auditoria')) {
      setActiveSection('producao');
    }
  }, [user?.perfil]);

  const getSectionTitle = () => {
    if (activeSection === 'tv_fabrica') return 'Painel Renetec';
    if (activeSection === 'dashboard') return 'Dashboard Executivo & Gerencial';
    if (activeSection === 'producao') return 'Apontamento de Produção (Chão de Fábrica)';
    if (activeSection === 'minhas_os') return 'Minhas Ordens de Serviço';
    if (activeSection === 'fila_testes') return 'Fila de Controle de Qualidade';
    if (activeSection === 'retrabalho') return 'Fila de Reparos Corretivos (Retrabalho)';
    if (activeSection === 'metas') return 'Metas Coletivas de Produção';
    if (activeSection === 'ordens_servico') return 'Gerenciamento de Ordens de Serviço';
    if (activeSection === 'auditoria') return 'Trilha de Auditoria & Logs de Segurança';
    return 'Visão Geral da Produção';
  };

  const getSectionSubtitle = () => {
    if (activeSection === 'tv_fabrica')
      return 'Visualização em tela cheia com termômetro de metas, bancadas ao vivo e FPY do dia.';
    if (activeSection === 'dashboard')
      return 'Indicadores de faturamento, lead time por equipamento, Pareto de defeitos e produtividade.';
    if (activeSection === 'producao')
      return 'Bancada técnica: controle de início, cronômetro automático no servidor e finalização de lotes.';
    if (activeSection === 'minhas_os')
      return 'Equipamentos alocados para sua bancada de produção e reparo.';
    if (activeSection === 'fila_testes')
      return 'Lotes prontos para teste, aprovação ou encaminhamento para retrabalho.';
    if (activeSection === 'retrabalho')
      return 'Equipamentos reprovados no CQ aguardando intervenção técnica e re-inspeção.';
    if (activeSection === 'metas')
      return 'Acompanhamento do termômetro de pontos (Base 250, Alvo 300, Excelência 350), qualidade e bônus.';
    if (activeSection === 'auditoria')
      return 'Registro imutável de todas as ações de usuários, mudanças de estado, logins e laudos técnicos.';
    return 'Acompanhamento em tempo real das ordens de serviço e metas de produção.';
  };


  return (
    <div className="min-h-screen bg-surface-base text-gray-100 flex flex-col antialiased">
      {/* Header Fixo */}
      <AppHeader
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isTvMode={activeSection === 'tv_fabrica'}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Contextual */}
        <AppSidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Área Central de Conteúdo */}
        <main
          className={
            activeSection === 'tv_fabrica'
              ? 'flex-1 overflow-y-auto p-2 sm:p-4 lg:p-5 space-y-4 pb-16 lg:pb-6'
              : 'flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-20 lg:pb-8'
          }
        >
          {/* Header da Seção Atual (Ocultado no modo TV para dar 100% de foco no painel) */}
          {activeSection !== 'tv_fabrica' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {getSectionTitle()}
                  </h1>
                  <StatusBadge perfil={user?.perfil} size="sm" />
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{getSectionSubtitle()}</p>
              </div>
            </div>
          )}

          {/* Renderização Condicional de Módulo com lazy loading */}
          <Suspense fallback={<PageSkeleton />}>
            {activeSection === 'tv_fabrica' ? (
              <TvFabricaPage />
            ) : activeSection === 'dashboard' ? (
              <DashboardGerencialPage />
            ) : activeSection === 'producao' ? (
              <ProducaoPage />
            ) : activeSection === 'fila_testes' ? (
              <QualidadePage />
            ) : activeSection === 'retrabalho' ? (
              <RetrabalhoPage />
            ) : activeSection === 'metas' ? (
              <MetasPage />
            ) : activeSection === 'auditoria' ? (
              <AuditoriaPage />
            ) : (
              <OsListPage onlyMine={activeSection === 'minhas_os' || user?.perfil === 'TECNICO'} />
            )}
          </Suspense>
        </main>

      </div>

      {/* Navegação Inferior para Mobile */}
      <MobileNav activeSection={activeSection} onSelectSection={setActiveSection} />
    </div>
  );
};

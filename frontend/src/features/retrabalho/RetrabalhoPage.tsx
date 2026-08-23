import React, { useState, useEffect, useCallback } from 'react';
import { retrabalhoApiService } from './retrabalho.service';
import type { RetrabalhoItemData, HistoricoRetrabalhoItem } from './retrabalho.types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { ConcluirRetrabalhoDrawer } from './ConcluirRetrabalhoDrawer';
import {
  Wrench,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldAlert,
  Play,
  History,
  Activity
} from 'lucide-react';

import { useRealtime } from '../realtime/RealtimeContext';

export const RetrabalhoPage: React.FC = () => {
  const [fila, setFila] = useState<RetrabalhoItemData[]>([]);
  const [historico, setHistorico] = useState<HistoricoRetrabalhoItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RetrabalhoItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [filaData, histData] = await Promise.all([
        retrabalhoApiService.getFila(),
        retrabalhoApiService.getHistorico(1, 5),
      ]);
      setFila(Array.isArray(filaData) ? filaData : []);
      setHistorico(Array.isArray(histData?.data) ? histData.data : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar fila de retrabalho.');
      setFila([]);
      setHistorico([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { subscribe } = useRealtime();

  useEffect(() => {
    loadData();
    const unsubscribe = subscribe('*', () => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData, subscribe]);

  // Iniciar a execução do retrabalho
  const handleIniciar = async (item: RetrabalhoItemData) => {
    try {
      setErrorMessage(null);
      await retrabalhoApiService.iniciar(item.id);
      const numOS = item.itemOrdemServico?.ordemServico?.numeroOS || '';
      setSuccessMessage(`Retrabalho da OS #${numOS} iniciado.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao iniciar retrabalho.');
    }
  };

  const openConclusao = (item: RetrabalhoItemData) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const currentFila = Array.isArray(fila) ? fila : [];
  const currentHistorico = Array.isArray(historico) ? historico : [];

  const pendentesCount = currentFila.filter((r) => r?.status === 'PENDENTE').length;
  const emExecucaoCount = currentFila.filter((r) => r?.status === 'EM_EXECUCAO').length;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>
            Fechar
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* ─── 1. KPIS ESPECÍFICOS DE RETRABALHO ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Retrabalhos Pendentes"
          value={pendentesCount}
          unit="itens"
          subtext="Aguardando início do reparo"
          variant={pendentesCount > 0 ? 'warning' : 'default'}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <KpiCard
          label="Em Execução na Bancada"
          value={emExecucaoCount}
          unit="itens"
          subtext="Técnicos trabalhando no conserto"
          variant="info"
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          label="Volume em Correção"
          value={currentFila.reduce((acc, r) => acc + (r?.quantidadeRetrabalho || 0), 0)}
          unit="unidades"
          subtext="Total de peças não-conformes"
          variant="default"
          icon={<Wrench className="w-4 h-4" />}
        />
        <KpiCard
          label="Resolução no 1º Retrabalho"
          value="95.4%"
          subtext="Aprovados no re-teste"
          variant="success"
          icon={<RotateCcw className="w-4 h-4" />}
        />
      </div>

      {/* ─── 2. FILA DE ORDENS DE RETRABALHO ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> Fila de Reparos Corretivos ({currentFila.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Peças reprovadas no teste de CQ aguardando intervenção técnica e encaminhamento para re-inspeção.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar Fila
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-52 rounded-xl bg-surface-card border border-surface-border animate-pulse p-4 space-y-3" />
            ))}
          </div>
        ) : currentFila.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-card border border-surface-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Nenhum equipamento em retrabalho!</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Todas as peças inspecionadas pelo CQ estão em conformidade e não há pendências de conserto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFila.map((item) => {
              const os = item?.itemOrdemServico?.ordemServico;
              const equip = item?.itemOrdemServico?.tipoEquipamento;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl bg-surface-card border transition-all duration-150 flex flex-col justify-between space-y-4 ${
                    item.status === 'EM_EXECUCAO'
                      ? 'border-amber-500/50 shadow-glow-primary'
                      : 'border-surface-border hover:border-surface-muted'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 tabular-nums">
                        OS #{os?.numeroOS || '—'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            item.status === 'EM_EXECUCAO'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                              : 'bg-red-500/10 text-red-300 border-red-500/30'
                          }`}
                        >
                          {item.status === 'EM_EXECUCAO' ? 'Em Reparo' : 'Pendente'}
                        </span>
                        {os?.prioridade && <StatusBadge prioridade={os.prioridade} size="sm" />}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {equip?.nome || 'Equipamento'}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-300 py-1.5 border-y border-surface-border/50">
                      <span>Volume a Corrigir: <strong className="text-amber-400 tabular-nums">{item.quantidadeRetrabalho} un</strong></span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <User className="w-3 h-3 text-sky-400" />
                        Técnico: <strong className="text-gray-200">{item.tecnicoResponsavel?.nome || 'Geral'}</strong>
                      </span>
                    </div>

                    {/* Laudo do CQ */}
                    <div className="p-2.5 rounded-lg bg-surface-base/80 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-amber-400 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{item.motivoReprovacao?.descricao || 'Não conformidade'}</span>
                      </div>
                      {item.detalhesDefeito && (
                        <p className="text-gray-300 text-[11px] leading-relaxed line-clamp-2">
                          {item.detalhesDefeito}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-2 border-t border-surface-border/50">
                    {item.status === 'PENDENTE' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleIniciar(item)}
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                        className="w-full"
                      >
                        Iniciar Reparo
                      </Button>
                    ) : (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => openConclusao(item)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="w-full"
                      >
                        Concluir e Enviar p/ Re-teste
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. HISTÓRICO DE RETRABALHOS CONCLUÍDOS ───────────────────────── */}
      {currentHistorico.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Reparos Corretivos Concluídos Recentemente
          </h3>

          <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border overflow-hidden">
            {currentHistorico.map((h, idx) => (
              <div key={h.id || idx} className="p-3 sm:px-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white tabular-nums">
                      OS #{h.itemOrdemServico?.ordemServico?.numeroOS || '—'}
                    </span>
                    <span className="text-gray-400">—</span>
                    <span className="text-gray-300 font-medium">
                      {h.itemOrdemServico?.tipoEquipamento?.nome || 'Equipamento'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Solução Técnica: <strong className="text-gray-300">{h.solucaoAplicada || 'Reparo concluído'}</strong> • Técnico: {h.tecnicoResponsavel?.nome || 'Bancada'}
                  </p>
                </div>

                <div className="text-right flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
                    {h.quantidadeRetrabalho} un em Re-teste
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer de Conclusão */}
      <ConcluirRetrabalhoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        retrabalho={selectedItem}
        onSuccess={loadData}
      />
    </div>
  );
};

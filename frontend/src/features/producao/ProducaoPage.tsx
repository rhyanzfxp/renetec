import React, { useState, useEffect, useCallback } from 'react';
import { producaoApiService } from './producao.service';
import type { FilaItemData, ProducaoAtivaData, ProducaoHistoricoItem } from './producao.types';
import { usePageData } from '../../hooks/usePageData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { FinalizarProducaoDrawer } from './FinalizarProducaoDrawer';
import { CriarLoteTecnicoDrawer } from './CriarLoteTecnicoDrawer';
import {
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  History,
  Timer,
  PlusCircle,
  Layers,
  AlertTriangle
} from 'lucide-react';

export const ProducaoPage: React.FC = () => {
  const [fila, setFila] = useState<FilaItemData[]>([]);
  const [producaoAtiva, setProducaoAtiva] = useState<ProducaoAtivaData | null>(null);
  const [historico, setHistorico] = useState<ProducaoHistoricoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCriarLoteOpen, setIsCriarLoteOpen] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState<string>('00:00:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carrega os dados de produção
  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [filaData, ativaData, histData] = await Promise.all([
        producaoApiService.getMinhaFila(),
        producaoApiService.getProducaoAtiva(),
        producaoApiService.getHistorico(1, 5),
      ]);
      setFila(Array.isArray(filaData) ? filaData : []);
      setProducaoAtiva(ativaData || null);
      setHistorico(Array.isArray(histData?.data) ? histData.data : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar dados do chão de fábrica.');
      setFila([]);
      setProducaoAtiva(null);
      setHistorico([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega apenas em eventos de produção e qualidade (debounce 400ms)
  usePageData({
    loadData,
    realtimeEvents: ['producao:iniciada', 'producao:finalizada', 'qualidade:aprovado', 'qualidade:reprovado', 'qualidade:novo_lote'],
    debounceMs: 400,
  });

  // Cronômetro em tempo real para produção ativa
  useEffect(() => {
    if (!producaoAtiva?.dataInicio) {
      setTempoDecorrido('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const inicio = new Date(producaoAtiva.dataInicio).getTime();
      const agora = new Date().getTime();
      const diffMs = Math.max(0, agora - inicio);

      const horas = Math.floor(diffMs / 3600000);
      const minutos = Math.floor((diffMs % 3600000) / 60000);
      const segundos = Math.floor((diffMs % 60000) / 1000);

      const formatado = `${horas.toString().padStart(2, '0')}:${minutos
        .toString()
        .padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      setTempoDecorrido(formatado);
    }, 1000);

    return () => clearInterval(interval);
  }, [producaoAtiva]);

  const [isDispatching, setIsDispatching] = useState<string | null>(null);

  // Iniciar produção de um item
  const handleIniciar = async (itemOrdemServicoId: string) => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      await producaoApiService.iniciarProducao(itemOrdemServicoId);
      await loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao iniciar produção.');
    } finally {
      setIsStarting(false);
    }
  };

  // Despachar caixa/lote salvo direto para o CQ com 1 clique
  const handleDespacharCQ = async (item: FilaItemData) => {
    try {
      setIsDispatching(item.id);
      setErrorMessage(null);
      await producaoApiService.despacharItemParaCQ(item.id);
      const num = item.ordemServico?.numeroOS || '—';
      setSuccessMessage(`OS #${num} (${item.quantidade} un) despachada com sucesso para o Testador do CQ!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao despachar lote para o CQ.');
    } finally {
      setIsDispatching(null);
    }
  };

  const currentFila = Array.isArray(fila) ? fila : [];
  const currentHistorico = Array.isArray(historico) ? historico : [];

  // Separa as caixas salvas na bancada (EM_PRODUCAO) das novas OSs aguardando início
  const caixasEmAndamento = currentFila.filter((item) => item.statusItem === 'EM_PRODUCAO');
  const lotesAguardando = currentFila.filter((item) => item.statusItem !== 'EM_PRODUCAO');

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

      {/* ─── BARRA DE AÇÃO RÁPIDA (AUTO-ATENDIMENTO DO TÉCNICO) ─────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-surface-card via-surface-card to-sky-950/20 border border-surface-border">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            Bancada de Produção & Reparo Técnico
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Apontamento com cronômetro em tempo real ou registro direto de lotes para testes de qualidade.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCriarLoteOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="shadow-glow-primary flex-shrink-0"
        >
          Novo Apontamento / Minha OS
        </Button>
      </div>

      {/* ─── 1. CARD DE PRODUÇÃO EM ANDAMENTO (CRONÔMETRO AO VIVO) ─────────── */}
      {producaoAtiva ? (
        <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-r from-amber-950/40 via-surface-card to-surface-card border-2 border-amber-500/40 shadow-panel relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Produção em Andamento na Bancada
                </span>
                {producaoAtiva?.itemOrdemServico?.ordemServico?.prioridade && (
                  <StatusBadge prioridade={producaoAtiva.itemOrdemServico.ordemServico.prioridade} size="sm" />
                )}
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>OS #{producaoAtiva?.itemOrdemServico?.ordemServico?.numeroOS || '—'}</span>
                  <span className="text-gray-400 font-normal">|</span>
                  <span className="text-gray-200">{producaoAtiva?.itemOrdemServico?.tipoEquipamento?.nome || 'Equipamento'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Cliente: <strong className="text-white">{producaoAtiva?.itemOrdemServico?.ordemServico?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações'}</strong> • Lote: <strong className="text-amber-300 tabular-nums">{producaoAtiva?.itemOrdemServico?.quantidade || 1} un</strong>
                </p>
              </div>

              {producaoAtiva?.itemOrdemServico?.defeitoRelatado && (
                <div className="p-2.5 rounded-lg bg-surface-base/80 border border-surface-border text-xs text-gray-300 max-w-xl">
                  <span className="text-gray-400 font-semibold">Defeito:</span> {producaoAtiva.itemOrdemServico.defeitoRelatado}
                </div>
              )}
            </div>

            {/* Cronômetro e Botão de Finalizar */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 border-t sm:border-t-0 border-surface-border pt-4 sm:pt-0">
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Tempo em Execução
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono tabular-nums tracking-tight mt-0.5">
                  {tempoDecorrido}
                </div>
              </div>

              <Button
                variant="success"
                size="lg"
                onClick={() => setIsDrawerOpen(true)}
                leftIcon={<CheckCircle2 className="w-5 h-5" />}
                className="w-full sm:w-auto shadow-glow-success"
              >
                Finalizar e Enviar ao CQ
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-surface-card/60 border border-surface-border/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Nenhum lote com cronômetro ativo no momento</p>
              <p className="text-xs text-gray-400">Você pode criar um novo apontamento no botão acima ou continuar suas caixas salvas abaixo.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar
          </Button>
        </div>
      )}

      {/* ─── 2. CAIXAS E LOTES SALVOS NA BANCADA (EM PROGRESSO) ──────────────── */}
      {caixasEmAndamento.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                📦 Caixas em Andamento na Minha Bancada ({caixasEmAndamento.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Caixas que você salvou o progresso para continuar reparando ou despachar ao testador quando estiverem prontas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caixasEmAndamento.map((item) => {
              const os = item?.ordemServico;
              const equip = item?.tipoEquipamento;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-gradient-to-b from-amber-950/20 to-surface-card border-2 border-amber-500/40 hover:border-amber-400 transition-all duration-150 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 tabular-nums flex items-center gap-1">
                        📦 OS #{os?.numeroOS || '—'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                        Na Bancada
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {equip?.nome || 'Equipamento'}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-300 py-1.5 border-y border-surface-border/50 bg-[#0d121c] px-2.5 rounded-lg">
                      <span>Lote Registrado: <strong className="text-emerald-400 tabular-nums">{item.quantidade} un</strong></span>
                      <span className="text-amber-400 font-bold tabular-nums">~{((Number(item.quantidade) || 0) * (equip?.pontos || 1)).toFixed(1)} pts</span>
                    </div>

                    {item.defeitoRelatado && (
                      <p className="text-xs text-amber-200/90 line-clamp-2 bg-amber-950/30 p-2 rounded border border-amber-800/30">
                        {item.defeitoRelatado}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCriarLoteOpen(true)}
                      className="text-xs"
                      title="Adicionar mais reparos desta caixa"
                    >
                      Continuar
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleDespacharCQ(item)}
                      disabled={isDispatching === item.id}
                      loading={isDispatching === item.id}
                      className="text-xs font-bold shadow-glow-success"
                      title="Enviar estas unidades prontas para teste no CQ"
                    >
                      Despachar CQ ⚡
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. FILA DE ORDENS DE SERVIÇO AGUARDANDO INÍCIO ─────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" /> Fila de Trabalho em Aberto ({lotesAguardando.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Equipamentos alocados para sua bancada aguardando início de reparo.</p>
          </div>

          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar Fila
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-xl bg-surface-card border border-surface-border animate-pulse p-4 space-y-3" />
            ))}
          </div>
        ) : lotesAguardando.length === 0 && caixasEmAndamento.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-card border border-surface-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Sua fila de bancada está livre!</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Clique em <strong>"Novo Apontamento / Minha OS"</strong> acima para registrar o lote que você concluiu hoje.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lotesAguardando.map((item) => {
              const os = item?.ordemServico;
              const equip = item?.tipoEquipamento;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-surface-muted transition-all duration-150 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 tabular-nums">
                        OS #{os?.numeroOS || '—'}
                      </span>
                      {os?.prioridade && <StatusBadge prioridade={os.prioridade} size="sm" />}
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
                      <span>Lote: <strong className="text-white tabular-nums">{item.quantidade} un</strong></span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3 text-sky-400" />
                        Estimado: <strong className="text-gray-200 tabular-nums">{equip?.tempoEstimadoMinutos || 40} min</strong>
                      </span>
                    </div>

                    {item.defeitoRelatado && (
                      <p className="text-xs text-gray-400 line-clamp-2 bg-surface-base/60 p-2 rounded border border-surface-border/50">
                        {item.defeitoRelatado}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleIniciar(item.id)}
                    disabled={isStarting || !!producaoAtiva}
                    title={producaoAtiva ? 'Finalize a produção ativa antes de iniciar outro lote' : ''}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                    className="w-full"
                  >
                    Iniciar Produção
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. HISTÓRICO DE PRODUÇÕES FINALIZADAS RECENTEMENTE ─────────────── */}
      {currentHistorico.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Lotes Concluídos Recentemente pelo Técnico
          </h3>

          <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border overflow-hidden">
            {currentHistorico.map((h) => (
              <div key={h.id} className="p-3 sm:px-4 flex items-center justify-between text-xs">
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
                  <p className="text-[11px] text-gray-400 truncate max-w-md">
                    Serviço: {h.servicoRealizado || 'Manutenção realizada'}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                    {h.quantidadeProduzida} un no CQ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer de Auto-apontamento do Técnico */}
      <CriarLoteTecnicoDrawer
        isOpen={isCriarLoteOpen}
        onClose={() => setIsCriarLoteOpen(false)}
        onSuccess={() => {
          setSuccessMessage('Lote de produção registrado e encaminhado para o Controle de Qualidade com sucesso!');
          setTimeout(() => setSuccessMessage(null), 5000);
          loadData();
        }}
      />

      {/* Drawer de Finalização de Produção Ativa */}
      <FinalizarProducaoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        producao={producaoAtiva}
        tempoDecorrido={tempoDecorrido}
        onSuccess={() => {
          setSuccessMessage('Produção concluída e enviada ao CQ!');
          setTimeout(() => setSuccessMessage(null), 5000);
          loadData();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { producaoApiService } from './producao.service';
import type { FilaItemData, ProducaoAtivaData, ProducaoHistoricoItem, ProducaoHojeResumo, OsEmAndamentoData } from './producao.types';
import { usePageData } from '../../hooks/usePageData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FinalizarProducaoDrawer } from './FinalizarProducaoDrawer';
import { CriarLoteTecnicoDrawer } from './CriarLoteTecnicoDrawer';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  History,
  PlusCircle,
  Layers,
  AlertTriangle,
  Edit3,
  Zap,
  Package,
  Play,
  Pause,
  Wrench,
  ShieldCheck,
  XCircle,
  Sparkles,
  CheckCheck,
  Calendar,
  Send,
  Trash2,
  ChevronDown,
} from 'lucide-react';

export const ProducaoPage: React.FC = () => {
  const [caixas, setCaixas] = useState<FilaItemData[]>([]);
  const [producaoAtiva, setProducaoAtiva] = useState<ProducaoAtivaData | null>(null);
  const [historico, setHistorico] = useState<ProducaoHistoricoItem[]>([]);
  const [producaoHoje, setProducaoHoje] = useState<ProducaoHojeResumo | null>(null);
  const [osEmAndamento, setOsEmAndamento] = useState<OsEmAndamentoData[]>([]);
  const [selectedOsParaContinuar, setSelectedOsParaContinuar] = useState<OsEmAndamentoData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCriarLoteOpen, setIsCriarLoteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState<string>('00:00:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPausing, setIsPausing] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState<string | null>(null);

  // Estados de abertura das gavetas (com persistência no localStorage)
  const [isOsAndamentoOpen, setIsOsAndamentoOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('renetec:gaveta_os_andamento');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isMinhasCaixasOpen, setIsMinhasCaixasOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('renetec:gaveta_minhas_caixas');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleOsAndamento = () => {
    setIsOsAndamentoOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('renetec:gaveta_os_andamento', String(next));
      } catch {}
      return next;
    });
  };

  const toggleMinhasCaixas = () => {
    setIsMinhasCaixasOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('renetec:gaveta_minhas_caixas', String(next));
      } catch {}
      return next;
    });
  };

  // Modal para Mandar OS ao CQ
  const [despacharCqModalOpen, setDespacharCqModalOpen] = useState(false);
  const [osParaDespacharCQ, setOsParaDespacharCQ] = useState<OsEmAndamentoData | null>(null);
  const [despacharCqObservacao, setDespacharCqObservacao] = useState('');
  const [isDespachandoCQ, setIsDespachandoCQ] = useState(false);

  // Modal para Excluir OS Errada
  const [excluirOsModalOpen, setExcluirOsModalOpen] = useState(false);
  const [osParaExcluir, setOsParaExcluir] = useState<OsEmAndamentoData | null>(null);
  const [isExcluindoOs, setIsExcluindoOs] = useState(false);

  // Modal para Concluir OS Definitivamente (secundário)
  const [concluirOsModalOpen, setConcluirOsModalOpen] = useState(false);
  const [osParaConcluir, setOsParaConcluir] = useState<OsEmAndamentoData | null>(null);
  const [concluirOsObservacao, setConcluirOsObservacao] = useState('');
  const [isConcluindoOs, setIsConcluindoOs] = useState(false);

  // Carrega todas as caixas, produção de hoje e OS em andamento do técnico
  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [caixasData, ativaData, histData, hojeData, emAndamentoData] = await Promise.all([
        producaoApiService.getMinhasCaixas().catch(() => []),
        producaoApiService.getProducaoAtiva().catch(() => null),
        producaoApiService.getHistorico(1, 10).catch(() => ({ data: [] })),
        producaoApiService.getProducaoHoje().catch(() => null),
        producaoApiService.getMinhasOsEmAndamento().catch(() => []),
      ]);
      setCaixas(Array.isArray(caixasData) ? caixasData : []);
      setProducaoAtiva(ativaData || null);
      setHistorico(Array.isArray(histData?.data) ? histData.data : []);
      setProducaoHoje(hojeData || null);
      setOsEmAndamento(Array.isArray(emAndamentoData) ? emAndamentoData : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar dados do chão de fábrica.');
      setCaixas([]);
      setProducaoAtiva(null);
      setHistorico([]);
      setProducaoHoje(null);
      setOsEmAndamento([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega em eventos de produção, qualidade e OS concluída (debounce 400ms)
  usePageData({
    loadData,
    realtimeEvents: [
      'producao:iniciada',
      'producao:finalizada',
      'producao:pausada',
      'producao:salva',
      'qualidade:aprovado',
      'qualidade:reprovado',
      'qualidade:novo_lote',
      'os:concluida',
      'os:despachada_cq',
      'os:deletada',
      'os:atualizada',
    ],
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

  // Iniciar produção ao vivo de uma caixa na bancada
  const handleIniciarProducao = async (item: FilaItemData) => {
    if (isStarting || isPausing) return;
    try {
      setIsStarting(item.id);
      setErrorMessage(null);
      await producaoApiService.iniciarProducao(item.id);
      setSuccessMessage(`Produção da OS #${item.ordemServico?.numeroOS || '—'} iniciada ao vivo!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao iniciar produção.');
    } finally {
      setIsStarting(null);
    }
  };

  // Pausar produção ativa na bancada para continuar depois
  const handlePausarProducao = async () => {
    if (!producaoAtiva?.id || isPausing) return;
    try {
      setIsPausing(true);
      setErrorMessage(null);
      await producaoApiService.pausarProducao(producaoAtiva.id);
      setSuccessMessage('Produção pausada. A OS continua salva na sua bancada para você retomar a qualquer momento.');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao pausar produção.');
    } finally {
      setIsPausing(false);
    }
  };

  // Despachar caixa/lote direto para o CQ com 1 clique
  const handleDespacharCQ = async (item: FilaItemData) => {
    if (isDispatching) return;
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

  // Concluir OS definitivamente
  const handleDespacharOsParaCQ = async () => {
    if (!osParaDespacharCQ || isDespachandoCQ) return;
    try {
      setIsDespachandoCQ(true);
      setErrorMessage(null);
      await producaoApiService.despacharOsParaCQ(
        osParaDespacharCQ.id,
        despacharCqObservacao.trim() || undefined
      );
      setSuccessMessage(`OS #${osParaDespacharCQ.numeroOS} enviada ao CQ com sucesso! Os equipamentos já estão na fila de testes.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setDespacharCqModalOpen(false);
      setOsParaDespacharCQ(null);
      setDespacharCqObservacao('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao enviar OS para o CQ.');
    } finally {
      setIsDespachandoCQ(false);
    }
  };

  const handleExcluirOS = async () => {
    if (!osParaExcluir || isExcluindoOs) return;
    try {
      setIsExcluindoOs(true);
      setErrorMessage(null);
      await producaoApiService.excluirOs(osParaExcluir.id);
      setSuccessMessage(`Ordem de Serviço #${osParaExcluir.numeroOS} excluída com sucesso.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setExcluirOsModalOpen(false);
      setOsParaExcluir(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao excluir ordem de serviço.');
    } finally {
      setIsExcluindoOs(false);
    }
  };

  const handleConcluirOS = async () => {
    if (!osParaConcluir || isConcluindoOs) return;
    try {
      setIsConcluindoOs(true);
      setErrorMessage(null);
      await producaoApiService.concluirOs(osParaConcluir.numeroOS, concluirOsObservacao.trim() || undefined);
      setSuccessMessage(`OS #${osParaConcluir.numeroOS} concluída com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setConcluirOsModalOpen(false);
      setOsParaConcluir(null);
      setConcluirOsObservacao('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao concluir ordem de serviço.');
    } finally {
      setIsConcluindoOs(false);
    }
  };

  const handleContinuarOS = (os: OsEmAndamentoData) => {
    setSelectedOsParaContinuar(os);
    setEditingItem(null);
    setIsCriarLoteOpen(true);
  };

  // Reabrir OS para continuar apontamento de unidades
  const handleReabrirOS = (item: FilaItemData) => {
    setEditingItem(item);
    setSelectedOsParaContinuar(null);
    setIsCriarLoteOpen(true);
  };

  const currentCaixas = Array.isArray(caixas) ? caixas : [];
  const currentHistorico = Array.isArray(historico) ? historico : [];

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
            Apontamento de caixas, início de produção ao vivo e envio de lotes para o Controle de Qualidade.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingItem(null);
            setSelectedOsParaContinuar(null);
            setIsCriarLoteOpen(true);
          }}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="shadow-glow-primary flex-shrink-0"
        >
          Novo Apontamento / Minha OS
        </Button>
      </div>

      {/* ─── BARRA SUPERIOR: MINHA PRODUÇÃO DE HOJE ─────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-400" /> Minha Produção de Hoje
          </h3>
          <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            {producaoHoje?.data ? new Date(producaoHoje.data + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Hoje'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card Reparados Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-emerald-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-400" /> Reparados
              </span>
              <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">HOJE</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {producaoHoje?.totalReparados ?? 0}
              </span>
              <span className="text-xs text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Equipamentos consertados hoje</p>
          </div>

          {/* Card Sem Defeito Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-sky-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Sem Defeito
              </span>
              <span className="text-[10px] text-sky-400/80 bg-sky-500/10 px-1.5 py-0.5 rounded font-mono font-bold">TRIAGEM</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {producaoHoje?.totalSemDefeito ?? 0}
              </span>
              <span className="text-xs text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Aprovados em triagem rápida</p>
          </div>

          {/* Card Sucata Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-red-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" /> Sucata
              </span>
              <span className="text-[10px] text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded font-mono font-bold">PERDA</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                {producaoHoje?.totalSucata ?? 0}
              </span>
              <span className="text-xs text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Sem possibilidade de reparo</p>
          </div>

          {/* Card Pontos Estimados Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-amber-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pontos Hoje
              </span>
              <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">PONTOS</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
                {(producaoHoje?.totalPontos ?? 0).toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">pts</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Crédito de peças reparadas</p>
          </div>
        </div>
      </div>

      {/* ─── GAVETA 1: MINHAS ORDENS DE SERVIÇO EM ANDAMENTO ────────────── */}
      <div className="rounded-xl bg-surface-card border border-surface-border overflow-hidden transition-all duration-200 shadow-sm">
        {/* Cabeçalho da Gaveta (Clicável para expandir/recolher) */}
        <div
          onClick={toggleOsAndamento}
          className="p-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-elevated/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-colors ${
                isOsAndamentoOpen
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-base text-gray-400 border border-surface-border'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Minhas OS em Andamento
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-surface-base text-brand-300 border border-brand-500/30">
                  {osEmAndamento.length}
                </span>

                {!isOsAndamentoOpen && osEmAndamento.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {osEmAndamento.reduce((acc, os) => acc + (os.totalGeralReparado ?? os.totalReparados ?? 0), 0)} rep acumuladas
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {isOsAndamentoOpen
                  ? 'Ordens de serviço abertas atribuídas a você na bancada. Continue apontando ou mande ao CQ.'
                  : `Gaveta recolhida • Clique para expandir as ${osEmAndamento.length} OSs`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                loadData();
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs text-gray-400 hover:text-white"
              title="Atualizar ordens de serviço"
            >
              Atualizar
            </Button>

            <div
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isOsAndamentoOpen
                  ? 'bg-surface-base border-surface-border text-gray-300'
                  : 'bg-brand-500/10 border-brand-500/30 text-brand-300'
              }`}
            >
              <span className="text-[11px] hidden sm:inline">
                {isOsAndamentoOpen ? 'Recolher' : 'Abrir'}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${
                  isOsAndamentoOpen ? 'rotate-180 text-brand-400' : 'rotate-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo da Gaveta */}
        {isOsAndamentoOpen && (
          <div className="p-4 pt-1 border-t border-surface-border/50 animate-fadeIn">
            {osEmAndamento.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-base/60 border border-surface-border text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Nenhuma OS em andamento no momento</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Clique em <strong>"Novo Apontamento / Minha OS"</strong> acima para registrar uma nova OS na bancada.
                </p>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {osEmAndamento.map((os) => (
              <div
                key={os.id}
                className="p-4 rounded-xl bg-surface-card border border-brand-500/30 hover:border-brand-500/60 transition-all duration-150 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tabular-nums flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-brand-400" /> OS #{os.numeroOS}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                        Em Andamento
                      </span>
                      {os.prioridade && <StatusBadge prioridade={os.prioridade as any} size="sm" />}
                      <button
                        type="button"
                        onClick={() => {
                          setOsParaExcluir(os);
                          setExcluirOsModalOpen(true);
                        }}
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/15 transition-colors ml-1"
                        title="Excluir OS incorreta / lançada por engano"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{os.clienteNome || os.cliente?.nomeRazaoSocial}</h4>
                    <p className="text-xs text-gray-400">
                      Aberta em: {new Date(os.dataCriacao || os.dataEntrada).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Resumo Acumulado na OS */}
                  <div className="p-2.5 rounded-lg bg-[#0d121c] border border-surface-border/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Total Acumulado nesta OS:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {os.totalGeralReparado ?? os.totalReparados ?? 0} rep
                      </span>
                      {(os.totalGeralSemDefeito ?? os.totalSemDefeito ?? 0) > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="font-bold text-sky-400 tabular-nums">
                            {os.totalGeralSemDefeito ?? os.totalSemDefeito} sem def
                          </span>
                        </>
                      )}
                      {(os.totalGeralSucata ?? os.totalSucata ?? 0) > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="font-bold text-red-400 tabular-nums">
                            {os.totalGeralSucata ?? os.totalSucata} suc
                          </span>
                        </>
                      )}
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-300 font-semibold tabular-nums">
                        {os.totalGeralEquipamentos ?? os.totalProcessado ?? 0} un total
                      </span>
                    </div>
                  </div>

                  {/* Detalhe por tipo de equipamento */}
                  {os.equipamentos && os.equipamentos.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">
                        Equipamentos ({os.equipamentos.length}):
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {os.equipamentos.map((eq) => (
                          <div
                            key={eq.tipoEquipamentoId}
                            className="flex items-center justify-between text-[11px] p-1.5 rounded bg-surface-base border border-surface-border/40"
                          >
                            <span className="text-gray-200 font-medium truncate max-w-[150px]" title={eq.tipoEquipamentoNome}>
                              {eq.tipoEquipamentoNome}
                            </span>
                            <span className="text-amber-300 font-mono tabular-nums font-semibold">
                              {eq.totalAcumulado} un ({eq.acumuladoReparado ?? eq.totalReparadas ?? 0} rep)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mini-histórico de dias se trabalhado em mais de 1 dia */}
                  {os.historicoDias && os.historicoDias.length > 1 && (
                    <div className="p-2 rounded-lg bg-surface-base/60 border border-surface-border/40 text-[10px] text-gray-400">
                      <span className="font-semibold text-gray-300 block mb-1">
                        Trabalhado em {os.historicoDias.length} dias:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {os.historicoDias.map((d: { data: string; totalReparado: number }, idx: number) => (
                          <span key={idx} className="bg-surface-elevated px-1.5 py-0.5 rounded border border-surface-border font-mono text-gray-300">
                            {d.data.split('-').slice(1).reverse().join('/')}: <strong className="text-emerald-400">{d.totalReparado} rep</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações da OS */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/50">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleContinuarOS(os)}
                    leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                    className="w-full font-bold text-xs"
                    title="Continuar apontando a produção de hoje nesta OS"
                  >
                    Continuar OS
                  </Button>

                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => {
                      setOsParaDespacharCQ(os);
                      setDespacharCqObservacao('');
                      setDespacharCqModalOpen(true);
                    }}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    className="w-full font-bold text-xs shadow-glow-success"
                    title="Enviar esta OS e equipamentos reparados para a fila de testes do CQ"
                  >
                    Mandar para o CQ
                  </Button>
                </div>
              </div>
            ))}
          </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 1. CARD DE PRODUÇÃO EM ANDAMENTO (CRONÔMETRO AO VIVO) ─────────── */}
      {producaoAtiva ? (
        <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-r from-amber-950/40 via-surface-card to-surface-card border-2 border-amber-500/40 shadow-panel relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Produção Ao Vivo na Bancada e Painel Renetec (TV)
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

            {/* Cronômetro e Botões de Concluir / Pausar */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 border-t sm:border-t-0 border-surface-border pt-4 sm:pt-0">
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Tempo em Execução
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono tabular-nums tracking-tight mt-0.5">
                  {tempoDecorrido}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handlePausarProducao}
                  disabled={isPausing}
                  loading={isPausing}
                  leftIcon={<Pause className="w-4 h-4 text-amber-400" />}
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40 font-semibold"
                  title="Pausar produção para continuar depois ou no outro dia"
                >
                  Pausar Produção
                </Button>

                <Button
                  variant="success"
                  size="md"
                  onClick={() => setIsDrawerOpen(true)}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  className="shadow-glow-success font-bold"
                >
                  Concluir Produção
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── GAVETA 2: MINHAS CAIXAS E ORDENS DE SERVIÇO NA BANCADA ─────────── */}
      <div className="rounded-xl bg-surface-card border border-surface-border overflow-hidden transition-all duration-200 shadow-sm">
        {/* Cabeçalho da Gaveta (Clicável para expandir/recolher) */}
        <div
          onClick={toggleMinhasCaixas}
          className="p-3.5 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-elevated/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg transition-colors ${
                isMinhasCaixasOpen
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'bg-surface-base text-gray-400 border border-surface-border'
              }`}
            >
              <Package className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Minhas Caixas & Ordens de Serviço
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-surface-base text-sky-300 border border-sky-500/30">
                  {currentCaixas.length}
                </span>

                {!isMinhasCaixasOpen && currentCaixas.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-sky-400 bg-sky-950/40 px-2.5 py-0.5 rounded-full border border-sky-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    {currentCaixas.filter((c) => c.statusItem === 'EM_PRODUCAO').length} na bancada
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {isMinhasCaixasOpen
                  ? 'Suas caixas em andamento na bancada. Clique em "Iniciar Produção" ou "Reabrir OS".'
                  : `Gaveta recolhida • Clique para expandir os ${currentCaixas.length} lotes de bancada`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                loadData();
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs text-gray-400 hover:text-white"
              title="Atualizar caixas"
            >
              Atualizar
            </Button>

            <div
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isMinhasCaixasOpen
                  ? 'bg-surface-base border-surface-border text-gray-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              <span className="text-[11px] hidden sm:inline">
                {isMinhasCaixasOpen ? 'Recolher' : 'Abrir'}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 text-gray-400 ${
                  isMinhasCaixasOpen ? 'rotate-180 text-sky-400' : 'rotate-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo da Gaveta */}
        {isMinhasCaixasOpen && (
          <div className="p-4 pt-1 border-t border-surface-border/50 animate-fadeIn">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-44 rounded-xl bg-surface-card border border-surface-border animate-pulse p-4 space-y-3" />
                ))}
              </div>
            ) : currentCaixas.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-base/60 border border-surface-border text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Sua bancada está livre!</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Clique em <strong>"Novo Apontamento / Minha OS"</strong> acima para registrar a caixa ou lote que você está trabalhando.
                </p>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCaixas.map((item) => {
              const os = item?.ordemServico;
              const equip = item?.tipoEquipamento;
              const isNoCQ = item.statusItem === 'AGUARDANDO_TESTE';
              const isEmBancada = item.statusItem === 'EM_PRODUCAO';
              const isItemAtivo = producaoAtiva?.itemOrdemServicoId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-4 shadow-sm ${
                    isItemAtivo
                      ? 'bg-gradient-to-b from-amber-950/30 to-surface-card border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                      : isEmBancada
                      ? 'bg-gradient-to-b from-sky-950/20 to-surface-card border-sky-500/40 hover:border-sky-400'
                      : isNoCQ
                      ? 'bg-gradient-to-b from-indigo-950/20 to-surface-card border-indigo-500/40 hover:border-indigo-400'
                      : 'bg-surface-card border-surface-border hover:border-surface-muted'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tabular-nums flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-sky-400" /> OS #{os?.numeroOS || '—'}
                      </span>
                      {isItemAtivo ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Ao Vivo
                        </span>
                      ) : isEmBancada ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                          Na Bancada
                        </span>
                      ) : isNoCQ ? (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase">
                          No Teste CQ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 border border-gray-500/30 text-[10px] font-bold uppercase">
                          Aguardando
                        </span>
                      )}
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
                      <span>Lote: <strong className="text-emerald-400 tabular-nums">{item.quantidade} un</strong></span>
                      {(() => {
                        const def = (item.defeitoRelatado || '').toLowerCase();
                        const matchRep = def.match(/(\d+)\s*rep/i);
                        const isSemDef = def.includes('sem defeito aparente') || (def.includes('sem def') && !matchRep);
                        if (isSemDef) {
                          return <span className="text-gray-400 font-semibold tabular-nums text-[11px]">0.0 pts (Sem Defeito)</span>;
                        }
                        const repQtd = matchRep ? parseInt(matchRep[1]) : (Number(item.quantidade) || 0);
                        return <span className="text-amber-400 font-bold tabular-nums">~{(repQtd * (equip?.pontos || 1.5)).toFixed(1)} pts</span>;
                      })()}
                    </div>

                    {item.defeitoRelatado && (
                      <p className="text-xs text-gray-300 line-clamp-2 bg-surface-base/80 p-2 rounded border border-surface-border/50">
                        {item.defeitoRelatado}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-surface-border/50">
                    {/* Botão de Iniciar Produção Ao Vivo se estiver na bancada */}
                    {!isNoCQ && (
                      <Button
                        variant={isItemAtivo ? 'outline' : 'success'}
                        size="sm"
                        onClick={() => {
                          if (isItemAtivo) {
                            handlePausarProducao();
                          } else {
                            handleIniciarProducao(item);
                          }
                        }}
                        disabled={isStarting === item.id || isPausing}
                        loading={isStarting === item.id}
                        leftIcon={
                          isItemAtivo ? (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )
                        }
                        className={`w-full font-bold text-xs ${
                          isItemAtivo
                            ? 'border-amber-500/50 text-amber-300 hover:bg-amber-950/40'
                            : 'shadow-glow-success'
                        }`}
                      >
                        {isItemAtivo ? 'Pausar Cronômetro' : 'Iniciar Produção Ao Vivo'}
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReabrirOS(item)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5 text-sky-400" />}
                        className="text-xs"
                        title="Reabrir formulário para atualizar as quantidades reparadas desta OS"
                      >
                        Reabrir OS
                      </Button>

                      {isNoCQ ? (
                        <div className="text-center py-1 bg-sky-950/40 border border-sky-800/40 rounded-lg text-[11px] text-sky-300 font-medium flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400 animate-spin" /> No Testador
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDespacharCQ(item)}
                          disabled={isDispatching === item.id}
                          loading={isDispatching === item.id}
                          leftIcon={<Zap className="w-3.5 h-3.5" />}
                          className="text-xs font-bold"
                          title="Enviar estas unidades prontas para teste no CQ"
                        >
                          Despachar CQ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 3. HISTÓRICO DE PRODUÇÕES RECENTES DO TÉCNICO ───────────────────── */}
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

                <div className="text-right flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                    {h.quantidadeProduzida} un no CQ
                  </span>
                  {h.itemOrdemServico && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReabrirOS(h.itemOrdemServico as any)}
                      leftIcon={<Edit3 className="w-3 h-3 text-sky-400" />}
                      className="text-[11px] h-7 px-2"
                      title="Reabrir formulário para atualizar as quantidades reparadas desta OS"
                    >
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Mandar OS para o CQ (Testes) */}
      {despacharCqModalOpen && osParaDespacharCQ && (
        <Modal
          isOpen={despacharCqModalOpen}
          onClose={() => setDespacharCqModalOpen(false)}
          title={`Mandar OS #${osParaDespacharCQ.numeroOS} para o CQ`}
          subtitle="Envio dos equipamentos reparados para a bancada do tester de qualidade"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDespacharCqModalOpen(false)}
                disabled={isDespachandoCQ}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleDespacharOsParaCQ}
                loading={isDespachandoCQ}
                disabled={isDespachandoCQ}
                leftIcon={<Send className="w-4 h-4" />}
                className="shadow-glow-success font-bold"
              >
                Confirmar Envio ao CQ
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              Você está enviando a <strong>OS #{osParaDespacharCQ.numeroOS}</strong> ({osParaDespacharCQ.clienteNome || osParaDespacharCQ.cliente?.nomeRazaoSocial}) para a fila de testes do Controle de Qualidade (CQ).
            </p>
            <div className="p-3 rounded-lg bg-surface-base border border-surface-border text-xs space-y-1">
              <span className="font-semibold text-gray-300 block">Resumo do lote a ser inspecionado:</span>
              <span className="text-emerald-400 font-bold">{osParaDespacharCQ.totalGeralReparado ?? osParaDespacharCQ.totalReparados ?? 0} reparadas</span>
              {(osParaDespacharCQ.totalGeralSemDefeito ?? osParaDespacharCQ.totalSemDefeito ?? 0) > 0 && (
                <span className="text-sky-400 font-bold"> • {osParaDespacharCQ.totalGeralSemDefeito ?? osParaDespacharCQ.totalSemDefeito} sem defeito</span>
              )}
              {(osParaDespacharCQ.totalGeralSucata ?? osParaDespacharCQ.totalSucata ?? 0) > 0 && (
                <span className="text-red-400 font-bold"> • {osParaDespacharCQ.totalGeralSucata ?? osParaDespacharCQ.totalSucata} sucata</span>
              )}
              <span className="text-gray-400"> ({osParaDespacharCQ.totalGeralEquipamentos ?? osParaDespacharCQ.totalProcessado ?? 0} un no total)</span>
            </div>
            <p className="text-xs text-sky-300 bg-sky-950/40 p-2.5 rounded border border-sky-800/40">
              ℹ️ Ao enviar para o CQ, a OS sairá da sua bancada de produção e entrará diretamente na tela do <strong>tester de qualidade</strong> para inspeção e testes de bancada.
            </p>
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-gray-400 block">
                Observações / Instruções para o testador CQ (opcional):
              </label>
              <textarea
                rows={2}
                value={despacharCqObservacao}
                onChange={(e) => setDespacharCqObservacao(e.target.value)}
                placeholder="Ex: Lote revisado, trocados conectores óticos da porta PON. Pronto para teste de potência."
                className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Excluir OS Errada */}
      {excluirOsModalOpen && osParaExcluir && (
        <Modal
          isOpen={excluirOsModalOpen}
          onClose={() => setExcluirOsModalOpen(false)}
          title={`Excluir OS #${osParaExcluir.numeroOS}`}
          subtitle="Remoção de Ordem de Serviço lançada por engano"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExcluirOsModalOpen(false)}
                disabled={isExcluindoOs}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExcluirOS}
                loading={isExcluindoOs}
                disabled={isExcluindoOs}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="font-bold"
              >
                Sim, Excluir OS
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-300">
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-xs text-red-200 space-y-2">
              <p className="font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /> Atenção: Esta ação é definitiva!
              </p>
              <p>
                Tem certeza de que deseja excluir a <strong>OS #{osParaExcluir.numeroOS}</strong> ({osParaExcluir.clienteNome || osParaExcluir.cliente?.nomeRazaoSocial})?
              </p>
              <p className="text-gray-400">
                Esta ação removerá a OS e todos os apontamentos vinculados a ela do banco de dados. Utilize esta opção caso a OS tenha sido criada por engano ou duplicada.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Concluir OS Definitivamente */}
      {concluirOsModalOpen && osParaConcluir && (
        <Modal
          isOpen={concluirOsModalOpen}
          onClose={() => setConcluirOsModalOpen(false)}
          title={`Concluir Ordem de Serviço #${osParaConcluir.numeroOS}`}
          subtitle="Finalização definitiva da OS"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConcluirOsModalOpen(false)}
                disabled={isConcluindoOs}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConcluirOS}
                loading={isConcluindoOs}
                disabled={isConcluindoOs}
                leftIcon={<CheckCheck className="w-4 h-4" />}
              >
                Confirmar Conclusão da OS
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              Você está prestes a concluir a <strong>OS #{osParaConcluir.numeroOS}</strong> ({osParaConcluir.clienteNome || osParaConcluir.cliente?.nomeRazaoSocial}).
            </p>
            <div className="p-3 rounded-lg bg-surface-base border border-surface-border text-xs space-y-1">
              <span className="font-semibold text-gray-300 block">Resumo acumulado:</span>
              <span className="text-emerald-400 font-bold">{osParaConcluir.totalGeralReparado ?? osParaConcluir.totalReparados ?? 0} reparadas</span>
              {(osParaConcluir.totalGeralSemDefeito ?? osParaConcluir.totalSemDefeito ?? 0) > 0 && <span className="text-sky-400 font-bold"> • {osParaConcluir.totalGeralSemDefeito ?? osParaConcluir.totalSemDefeito} sem defeito</span>}
              {(osParaConcluir.totalGeralSucata ?? osParaConcluir.totalSucata ?? 0) > 0 && <span className="text-red-400 font-bold"> • {osParaConcluir.totalGeralSucata ?? osParaConcluir.totalSucata} sucata</span>}
              <span className="text-gray-400"> ({osParaConcluir.totalGeralEquipamentos ?? osParaConcluir.totalProcessado ?? 0} equipamentos no total)</span>
            </div>
            <p className="text-xs text-gray-400">
              O status da OS será alterado para CONCLUÍDO e ela sairá da sua lista de OSs em andamento.
            </p>
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-gray-400 block">
                Observações finais de conclusão (opcional):
              </label>
              <textarea
                rows={2}
                value={concluirOsObservacao}
                onChange={(e) => setConcluirOsObservacao(e.target.value)}
                placeholder="Ex: Todos os equipamentos testados e embalados para entrega."
                className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Drawer de Auto-apontamento do Técnico */}
      <CriarLoteTecnicoDrawer
        isOpen={isCriarLoteOpen}
        initialItem={editingItem}
        initialOs={selectedOsParaContinuar}
        onClose={() => {
          setIsCriarLoteOpen(false);
          setEditingItem(null);
          setSelectedOsParaContinuar(null);
        }}
        onSuccess={() => {
          setSuccessMessage('Apontamento de OS registrado com sucesso!');
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

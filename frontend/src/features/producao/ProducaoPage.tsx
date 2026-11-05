import React, { useState, useCallback } from 'react';
import { producaoApiService } from './producao.service';
import type { FilaItemData, ProducaoHistoricoItem, ProducaoHojeResumo, OsEmAndamentoData } from './producao.types';
import { usePageData } from '../../hooks/usePageData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CriarLoteTecnicoDrawer } from './CriarLoteTecnicoDrawer';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  History,
  PlusCircle,
  Layers,
  AlertTriangle,
  Edit3,
  Zap,
  Package,
  Play,
  Wrench,
  ShieldCheck,
  XCircle,
  Sparkles,
  CheckCheck,
  Calendar,
  Send,
  Trash2,
  ChevronDown,
  Search,
  X,
  Ban,
} from 'lucide-react';

export const ProducaoPage: React.FC = () => {
  const [caixas, setCaixas] = useState<FilaItemData[]>([]);
  const [historico, setHistorico] = useState<ProducaoHistoricoItem[]>([]);
  const [producaoHoje, setProducaoHoje] = useState<ProducaoHojeResumo | null>(null);
  const [osEmAndamento, setOsEmAndamento] = useState<OsEmAndamentoData[]>([]);
  const [selectedOsParaContinuar, setSelectedOsParaContinuar] = useState<OsEmAndamentoData | null>(null);
  const [termoBusca, setTermoBusca] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isCriarLoteOpen, setIsCriarLoteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      const [caixasData, histData, hojeData, emAndamentoData] = await Promise.all([
        producaoApiService.getMinhasCaixas().catch(() => []),
        producaoApiService.getHistorico(1, 10).catch(() => ({ data: [] })),
        producaoApiService.getProducaoHoje().catch(() => null),
        producaoApiService.getMinhasOsEmAndamento().catch(() => []),
      ]);
      setCaixas(Array.isArray(caixasData) ? caixasData : []);
      setHistorico(Array.isArray(histData?.data) ? histData.data : []);
      setProducaoHoje(hojeData || null);
      setOsEmAndamento(Array.isArray(emAndamentoData) ? emAndamentoData : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar dados do chão de fábrica.');
      setCaixas([]);
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

  const handleFinalizarCaixa = async (item: FilaItemData) => {
    const num = item.ordemServico?.numeroOS;
    const osId = item.ordemServicoId || item.ordemServico?.id;
    if (!num && !osId) return;

    try {
      setErrorMessage(null);
      await producaoApiService.concluirOs(num || osId, 'Finalizada pela bancada');
      setSuccessMessage(`OS #${num || '—'} finalizada com sucesso e retirada da sua bancada!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao finalizar OS.');
    }
  };

  const handleContinuarOS = (os: OsEmAndamentoData) => {
    setSelectedOsParaContinuar(os);
    setEditingItem(null);
    setIsCriarLoteOpen(true);
  };

  // Reabrir OS para continuar apontamento de unidades
  const handleReabrirOS = (item: FilaItemData) => {
    const numOS = item.ordemServico?.numeroOS;
    const matchingOs = numOS ? osEmAndamento.find((o) => o.numeroOS === numOS) : null;
    if (matchingOs) {
      setSelectedOsParaContinuar(matchingOs);
      setEditingItem(null);
    } else {
      setEditingItem(item);
      setSelectedOsParaContinuar(null);
    }
    setIsCriarLoteOpen(true);
  };

  const currentCaixas = Array.isArray(caixas) ? caixas : [];
  const currentHistorico = Array.isArray(historico) ? historico : [];

  const termo = termoBusca.toLowerCase().trim();

  const osEmAndamentoFiltradas = osEmAndamento.filter((os) => {
    if (!termo) return true;
    const numOS = String(os.numeroOS || '');
    const clienteNome = (os.clienteNome || os.cliente?.nomeRazaoSocial || '').toLowerCase();
    const equipNomes = (os.equipamentos || []).map((eq) => eq.tipoEquipamentoNome.toLowerCase()).join(' ');
    const obs = (os.observacoes || '').toLowerCase();
    return numOS.includes(termo) || clienteNome.includes(termo) || equipNomes.includes(termo) || obs.includes(termo);
  });

  const caixasFiltradas = currentCaixas.filter((item) => {
    if (!termo) return true;
    const numOS = String(item.ordemServico?.numeroOS || '');
    const clienteNome = (item.ordemServico?.cliente?.nomeRazaoSocial || '').toLowerCase();
    const equipNome = (item.tipoEquipamento?.nome || '').toLowerCase();
    const equipModelo = (item.tipoEquipamento?.modelo || '').toLowerCase();
    const equipMarca = (item.tipoEquipamento?.marca || '').toLowerCase();
    const defeito = (item.defeitoRelatado || '').toLowerCase();
    return (
      numOS.includes(termo) ||
      clienteNome.includes(termo) ||
      equipNome.includes(termo) ||
      equipModelo.includes(termo) ||
      equipMarca.includes(termo) ||
      defeito.includes(termo)
    );
  });

  const historicoFiltrado = currentHistorico.filter((h) => {
    if (!termo) return true;
    const numOS = String(h.itemOrdemServico?.ordemServico?.numeroOS || '');
    const clienteNome = (h.itemOrdemServico?.ordemServico?.cliente?.nomeRazaoSocial || '').toLowerCase();
    const equipNome = (h.itemOrdemServico?.tipoEquipamento?.nome || '').toLowerCase();
    const servico = (h.servicoRealizado || '').toLowerCase();
    const obs = (h.observacao || '').toLowerCase();
    return (
      numOS.includes(termo) ||
      clienteNome.includes(termo) ||
      equipNome.includes(termo) ||
      servico.includes(termo) ||
      obs.includes(termo)
    );
  });

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/50 flex items-center justify-between text-xs text-red-700 dark:text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage(null)}>
            Fechar
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* ─── BARRA DE AÇÃO RÁPIDA (AUTO-ATENDIMENTO DO TÉCNICO) ─────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-surface-card via-surface-card to-sky-50 dark:to-sky-950/20 border border-surface-border">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
            Bancada de Produção & Reparo Técnico
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Apontamento de caixas e envio de lotes para o Controle de Qualidade.
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
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Minha Produção de Hoje
          </h3>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            {producaoHoje?.data ? new Date(producaoHoje.data + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Hoje'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card Reparados Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-emerald-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Reparados
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">HOJE</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-mono tabular-nums">
                {producaoHoje?.totalReparados ?? 0}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Equipamentos consertados hoje</p>
          </div>

          {/* Card Sem Defeito Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-sky-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Sem Defeito
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-mono font-bold">TRIAGEM</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-mono tabular-nums">
                {producaoHoje?.totalSemDefeito ?? 0}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Aprovados em triagem rápida</p>
          </div>

          {/* Card Sucata Hoje */}
          <div className="p-4 rounded-xl bg-surface-card border border-red-500/30 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" /> Mortas / Sucata
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-mono font-bold">PERDA</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-mono tabular-nums">
                {producaoHoje?.totalSucata ?? 0}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Sem possibilidade de reparo</p>
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

      {/* ─── BARRA DE PESQUISA POR Nº OS, CLIENTE OU MODELO ────────────────── */}
      {(osEmAndamento.length > 0 || currentCaixas.length > 0 || currentHistorico.length > 0 || termoBusca) && (
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Pesquisar por nº da OS, nome da empresa/cliente ou modelo do equipamento..."
            className="w-full h-10 pl-9 pr-9 bg-surface-card border border-surface-border rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors shadow-sm"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-0.5 rounded cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Minhas OS em Andamento
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-surface-base text-brand-600 dark:text-brand-300 border border-brand-500/30">
                  {osEmAndamentoFiltradas.length}{osEmAndamentoFiltradas.length !== osEmAndamento.length ? ` de ${osEmAndamento.length}` : ''}
                </span>

                {!isOsAndamentoOpen && osEmAndamento.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {osEmAndamento.reduce((acc, os) => acc + (os.totalGeralReparado ?? os.totalReparados ?? 0), 0)} rep acumuladas
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
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
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Atualizar ordens de serviço"
            >
              Atualizar
            </Button>

            <div
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isOsAndamentoOpen
                  ? 'bg-surface-base border-surface-border text-gray-500 dark:text-gray-300'
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
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Nenhuma OS em andamento no momento</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Clique em <strong>"Novo Apontamento / Minha OS"</strong> acima para registrar uma nova OS na bancada.
                </p>
              </div>
            ) : osEmAndamentoFiltradas.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-base/60 border border-surface-border text-center space-y-2">
                <Search className="w-7 h-7 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Nenhuma OS em andamento encontrada para "{termoBusca}"</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Nenhuma ordem de serviço com esse número, cliente ou modelo encontrada na sua bancada.
                </p>
                <Button variant="outline" size="sm" onClick={() => setTermoBusca('')} className="mt-1">
                  Limpar Filtro
                </Button>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {osEmAndamentoFiltradas.map((os) => (
              <div
                key={os.id}
                className="p-4 rounded-xl bg-surface-card border border-brand-500/30 hover:border-brand-500/60 transition-all duration-150 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" /> OS #{os.numeroOS}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                        Em Andamento
                      </span>
                      {os.prioridade && <StatusBadge prioridade={os.prioridade as any} size="sm" />}
                      <button
                        type="button"
                        onClick={() => {
                          setOsParaExcluir(os);
                          setExcluirOsModalOpen(true);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
                        title="Excluir OS incorreta / lançada por engano"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{os.clienteNome || os.cliente?.nomeRazaoSocial}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Aberta em: {new Date(os.dataCriacao || os.dataEntrada).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Resumo Acumulado na OS */}
                  <div className="p-2.5 rounded-lg bg-surface-elevated/70 border border-surface-border/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                      Total Acumulado nesta OS:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {os.totalGeralReparado ?? os.totalReparados ?? 0} rep
                      </span>
                      {(os.totalGeralSemDefeito ?? os.totalSemDefeito ?? 0) > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                            {os.totalGeralSemDefeito ?? os.totalSemDefeito} sem def
                          </span>
                        </>
                      )}
                      {(os.totalGeralSucata ?? os.totalSucata ?? 0) > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                            {os.totalGeralSucata ?? os.totalSucata} suc
                          </span>
                        </>
                      )}
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-600 dark:text-gray-300 font-semibold tabular-nums">
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
                            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[150px]" title={eq.tipoEquipamentoNome}>
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
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Trabalhado em {os.historicoDias.length} dias:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {os.historicoDias.map((d: { data: string; totalReparado: number }, idx: number) => (
                          <span key={idx} className="bg-surface-elevated px-1.5 py-0.5 rounded border border-surface-border font-mono text-gray-700 dark:text-gray-300">
                            {d.data.split('-').slice(1).reverse().join('/')}: <strong className="text-emerald-400">{d.totalReparado} rep</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações da OS */}
                <div className="space-y-2 pt-2 border-t border-surface-border/50">
                  <div className="grid grid-cols-2 gap-2">
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
                      Despachar para o CQ
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOsParaConcluir(os);
                      setConcluirOsObservacao('');
                      setConcluirOsModalOpen(true);
                    }}
                    leftIcon={<CheckCheck className="w-3.5 h-3.5 text-emerald-500" />}
                    className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                    title="Finalizar/Concluir esta OS e remover da sua tela"
                  >
                    Finalizar / Concluir OS
                  </Button>
                </div>
              </div>
            ))}
          </div>
            )}
          </div>
        )}
      </div>

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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Minhas Caixas & Ordens de Serviço
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-surface-base text-sky-600 dark:text-sky-300 border border-sky-500/30">
                  {caixasFiltradas.length}{caixasFiltradas.length !== currentCaixas.length ? ` de ${currentCaixas.length}` : ''}
                </span>

                {!isMinhasCaixasOpen && currentCaixas.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {currentCaixas.filter((c) => c.statusItem === 'EM_PRODUCAO').length} na bancada
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {isMinhasCaixasOpen
                  ? 'Suas caixas em andamento na bancada. Clique em "Reabrir OS" ou "Despachar CQ".'
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
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Atualizar caixas"
            >
              Atualizar
            </Button>

            <div
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isMinhasCaixasOpen
                  ? 'bg-surface-base border-surface-border text-gray-500 dark:text-gray-300'
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
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sua bancada está livre!</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Clique em <strong>"Novo Apontamento / Minha OS"</strong> acima para registrar a caixa ou lote que você está trabalhando.
                </p>
              </div>
            ) : caixasFiltradas.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-base/60 border border-surface-border text-center space-y-2">
                <Search className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Nenhuma caixa encontrada para "{termoBusca}"</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Nenhuma caixa com esse número de OS, cliente ou modelo encontrada na bancada.
                </p>
                <Button variant="outline" size="sm" onClick={() => setTermoBusca('')} className="mt-1">
                  Limpar Filtro
                </Button>
              </div>
            ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caixasFiltradas.map((item) => {
              const os = item?.ordemServico;
              const equip = item?.tipoEquipamento;
              const isNoCQ = item.statusItem === 'AGUARDANDO_TESTE';
              const isEmBancada = item.statusItem === 'EM_PRODUCAO';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between space-y-4 shadow-sm ${
                    isEmBancada
                      ? 'bg-gradient-to-b from-sky-500/10 to-surface-card border-sky-500/40 hover:border-sky-400'
                      : isNoCQ
                      ? 'bg-gradient-to-b from-indigo-500/10 to-surface-card border-indigo-500/40 hover:border-indigo-400'
                      : 'bg-surface-card border-surface-border hover:border-surface-muted'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> OS #{os?.numeroOS || '—'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isEmBancada ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[10px] font-bold uppercase">
                            Na Bancada
                          </span>
                        ) : isNoCQ ? (
                          <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-[10px] font-bold uppercase">
                            No Teste CQ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30 text-[10px] font-bold uppercase">
                            Aguardando
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFinalizarCaixa(item)}
                          className="p-1 rounded text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors ml-0.5"
                          title="Finalizar OS e retirar da bancada"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                        {equip?.nome || 'Equipamento'}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {os?.cliente?.nomeRazaoSocial || 'MARANET Telecomunicações'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 py-1.5 border-y border-surface-border/50 bg-surface-elevated/70 px-2.5 rounded-lg flex-wrap gap-1">
                      <span>Lote: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{item.quantidade} un</strong></span>
                      {((item as any).totalSucataCaixa > 0 || (item.quantidadeSucata && item.quantidadeSucata > 0)) && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" /> {(item as any).totalSucataCaixa || item.quantidadeSucata} sucata
                        </span>
                      )}
                      {(() => {
                        const def = (item.defeitoRelatado || '').toLowerCase();
                        const matchRep = def.match(/(\d+)\s*rep/i);
                        const isSemDef = def.includes('sem defeito aparente') || (def.includes('sem def') && !matchRep);
                        if (isSemDef) {
                          return <span className="text-gray-500 dark:text-gray-400 font-semibold tabular-nums text-[11px]">0.0 pts (Sem Defeito)</span>;
                        }
                        const repQtd = matchRep ? parseInt(matchRep[1]) : (Number(item.quantidade) || 0);
                        return <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">~{(repQtd * (equip?.pontos || 1.5)).toFixed(1)} pts</span>;
                      })()}
                    </div>

                    {item.defeitoRelatado && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 bg-surface-base/80 p-2 rounded border border-surface-border/50">
                        {item.defeitoRelatado}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-surface-border/50">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReabrirOS(item)}
                        leftIcon={<Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                        className="text-xs"
                        title="Reabrir formulário para atualizar as quantidades reparadas desta OS"
                      >
                        Reabrir OS
                      </Button>

                      {isNoCQ ? (
                        <div className="text-center py-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 rounded-lg text-[11px] text-sky-700 dark:text-sky-300 font-medium flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" /> No Testador
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

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFinalizarCaixa(item)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                      title="Finalizar esta OS e retirar da sua bancada"
                    >
                      Finalizar / Concluir OS
                    </Button>
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
            <History className="w-3.5 h-3.5" /> Lotes Concluídos Recentemente pelo Técnico ({historicoFiltrado.length}{historicoFiltrado.length !== currentHistorico.length ? ` de ${currentHistorico.length}` : ''})
          </h3>

          <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border overflow-hidden">
            {historicoFiltrado.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                Nenhum lote no histórico recente correspondente a "{termoBusca}".
              </div>
            ) : (
              historicoFiltrado.map((h) => (
                <div key={h.id} className="p-3 sm:px-4 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                        OS #{h.itemOrdemServico?.ordemServico?.numeroOS || '—'}
                      </span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {h.itemOrdemServico?.tipoEquipamento?.nome || 'Equipamento'}
                      </span>
                      {h.itemOrdemServico?.ordemServico?.cliente?.nomeRazaoSocial && (
                        <span className="text-gray-400 text-[11px] hidden md:inline">
                          • {h.itemOrdemServico.ordemServico.cliente.nomeRazaoSocial}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-md">
                      Serviço: {h.servicoRealizado || 'Manutenção realizada'}
                    </p>
                  </div>

                  <div className="text-right flex items-center gap-2 flex-wrap justify-end">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                      {h.quantidadeProduzida} un no CQ
                    </span>

                    {/* Tag de Sucata */}
                    {(((h as any).quantidadeSucata > 0) || (h.observacao && h.observacao.includes('[Sucata:')) || (h.servicoRealizado && h.servicoRealizado.toLowerCase().includes('sucata'))) && (
                      <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 text-[10px] font-semibold tabular-nums flex items-center gap-1">
                        <Ban className="w-3 h-3 text-red-500 dark:text-red-400" /> {(h as any).quantidadeSucata || (h.observacao?.match(/\[Sucata:\s*(\d+)/i)?.[1]) || ''} Sucata
                      </span>
                    )}

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
              ))
            )}
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
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Você está enviando a <strong>OS #{osParaDespacharCQ.numeroOS}</strong> ({osParaDespacharCQ.clienteNome || osParaDespacharCQ.cliente?.nomeRazaoSocial}) para a fila de testes do Controle de Qualidade (CQ).
            </p>
            <div className="p-3 rounded-lg bg-surface-base border border-surface-border text-xs space-y-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300 block">Resumo do lote a ser inspecionado:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{osParaDespacharCQ.totalGeralReparado ?? osParaDespacharCQ.totalReparados ?? 0} reparadas</span>
              {(osParaDespacharCQ.totalGeralSemDefeito ?? osParaDespacharCQ.totalSemDefeito ?? 0) > 0 && (
                <span className="text-sky-600 dark:text-sky-400 font-bold"> • {osParaDespacharCQ.totalGeralSemDefeito ?? osParaDespacharCQ.totalSemDefeito} sem defeito</span>
              )}
              {(osParaDespacharCQ.totalGeralSucata ?? osParaDespacharCQ.totalSucata ?? 0) > 0 && (
                <span className="text-red-600 dark:text-red-400 font-bold"> • {osParaDespacharCQ.totalGeralSucata ?? osParaDespacharCQ.totalSucata} sucata</span>
              )}
              <span className="text-gray-500 dark:text-gray-400"> ({osParaDespacharCQ.totalGeralEquipamentos ?? osParaDespacharCQ.totalProcessado ?? 0} un no total)</span>
            </div>
            <p className="text-xs text-sky-800 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/40 p-2.5 rounded border border-sky-300 dark:border-sky-800/40">
              ℹ️ Ao enviar para o CQ, a OS sairá da sua bancada de produção e entrará diretamente na tela do <strong>tester de qualidade</strong> para inspeção e testes de bancada.
            </p>
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-400 block">
                Observações / Instruções para o testador CQ (opcional):
              </label>
              <textarea
                rows={2}
                value={despacharCqObservacao}
                onChange={(e) => setDespacharCqObservacao(e.target.value)}
                placeholder="Ex: Lote revisado, trocados conectores óticos da porta PON. Pronto para teste de potência."
                className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Remover / Finalizar OS da Bancada */}
      {excluirOsModalOpen && osParaExcluir && (
        <Modal
          isOpen={excluirOsModalOpen}
          onClose={() => setExcluirOsModalOpen(false)}
          title={`Remover OS #${osParaExcluir.numeroOS} da Bancada`}
          subtitle="Finalização e limpeza da tela de trabalho"
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
                variant="primary"
                size="sm"
                onClick={handleExcluirOS}
                loading={isExcluindoOs}
                disabled={isExcluindoOs}
                leftIcon={<CheckCheck className="w-4 h-4" />}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Sim, Finalizar e Remover da Bancada
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="p-3.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-xs text-sky-900 dark:text-sky-200 space-y-2">
              <p className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Limpeza da Bancada de Trabalho
              </p>
              <p>
                Deseja finalizar e retirar a <strong>OS #{osParaExcluir.numeroOS}</strong> ({osParaExcluir.clienteNome || osParaExcluir.cliente?.nomeRazaoSocial}) da sua bancada?
              </p>
              <div className="p-2.5 rounded bg-surface-card border border-surface-border space-y-1 text-gray-700 dark:text-gray-300">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  🛡️ Dados 100% preservados para relatórios e administração:
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Todas as peças reparadas, sem defeito, sucatas, retrabalhos, testes de CQ e pontos da meta permanecem salvos no banco de dados e computados nos relatórios da empresa. A OS apenas não aparecerá mais na bancada para não poluir sua tela.
                </p>
              </div>
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
                variant="primary"
                size="sm"
                onClick={handleConcluirOS}
                loading={isConcluindoOs}
                disabled={isConcluindoOs}
                leftIcon={<CheckCheck className="w-4 h-4" />}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
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
                className="w-full bg-surface-base border border-surface-border rounded-lg p-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
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
        osEmAndamento={osEmAndamento}
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
    </div>
  );
};

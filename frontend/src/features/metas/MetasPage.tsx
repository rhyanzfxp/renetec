import React, { useState, useEffect, useCallback } from 'react';
import { metaApiService } from './meta.service';
import type {
  MetaAtualData,
  TabelaPontuacaoItem,
  GuiaComoUsarItem,
} from './meta.types';
import { useRealtime } from '../realtime/RealtimeContext';
import { TermometroMetas } from './TermometroMetas';
import { ConfigMetaModal } from './ConfigMetaModal';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../auth/AuthContext';
import {
  TrendingUp,
  Calendar,
  Flame,
  Zap,
  Settings2,
  RefreshCw,
  AlertTriangle,
  Award,
  DollarSign,
  Calculator,
  ListOrdered,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

export const MetasPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bonus' | 'pontuacao' | 'guia'>('dashboard');
  const [data, setData] = useState<MetaAtualData | null>(null);
  const [tabelaPontuacao, setTabelaPontuacao] = useState<TabelaPontuacaoItem[]>([]);
  const [guiaComoUsar, setGuiaComoUsar] = useState<GuiaComoUsarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Simulador de Bônus
  const [simuladorFaturamento, setSimuladorFaturamento] = useState<string>('');
  const [cenarioSimulacao, setCenarioSimulacao] = useState<'ALVO' | 'EXCELENCIA' | 'BASE' | 'REAL'>('ALVO');
  const [isUpdatingBonus, setIsUpdatingBonus] = useState(false);
  const [bonusFeedback, setBonusFeedback] = useState<string | null>(null);

  // Ref para garantir que o faturamento só é pré-preenchido uma vez (primeiro carregamento)
  // Evita que o loadData reponha o valor quando o usuário apaga o campo
  const faturamentoInicializadoRef = React.useRef(false);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [metaData, ptData, guiaData] = await Promise.all([
        metaApiService.getMetaAtual(),
        metaApiService.getTabelaPontuacao(),
        metaApiService.getGuiaComoUsar(),
      ]);
      setData(metaData);
      setTabelaPontuacao(ptData);
      setGuiaComoUsar(guiaData);
      // Pré-preenche apenas na primeira carga — jamais sobrescreve edições do usuário
      if (!faturamentoInicializadoRef.current && metaData.faturamentoBaseCalculo > 0) {
        setSimuladorFaturamento(metaData.faturamentoBaseCalculo.toString());
        faturamentoInicializadoRef.current = true;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar dados de metas.');
    } finally {
      setIsLoading(false);
    }
  }, []); // ← sem dependência de simuladorFaturamento: não causa loop

  const { subscribe } = useRealtime();

  useEffect(() => {
    loadData();
    const unsubscribe = subscribe('*', (event) => {
      if (
        event.type === 'qualidade:aprovado' ||
        event.type === 'qualidade:reprovado' ||
        event.type === 'meta:atualizada'
      ) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData, subscribe]);

  const handleSimularFaturamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    try {
      setIsUpdatingBonus(true);
      setBonusFeedback(null);
      const cleaned = simuladorFaturamento.trim().replace(/^R\$\s?/, '').replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(cleaned) || 0;
      const updated = await metaApiService.updateBonusSimulation({
        faturamentoRecebido: valor,
      });
      if (updated) {
        setData(updated);
      }
      setBonusFeedback('Cálculo de bônus atualizado com sucesso!');
      setTimeout(() => setBonusFeedback(null), 3000);
    } catch {
      setErrorMessage('Falha ao atualizar simulação de bônus.');
    } finally {
      setIsUpdatingBonus(false);
    }
  };

  const handleToggleMetaIndividual = async (colabId: string, currentStatus: boolean) => {
    if (!data || user?.perfil !== 'ADMIN') return;
    try {
      setIsUpdatingBonus(true);
      const statusMap = { [colabId]: !currentStatus };
      const cleaned = simuladorFaturamento.trim().replace(/^R\$\s?/, '').replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(cleaned) || data.faturamentoBaseCalculo;
      const updated = await metaApiService.updateBonusSimulation({
        faturamentoRecebido: valor,
        metaIndividualStatus: statusMap,
      });
      if (updated) {
        setData(updated);
      }
    } catch {
      setErrorMessage('Erro ao alterar status da meta individual.');
    } finally {
      setIsUpdatingBonus(false);
    }
  };

  const handleReset = async (resetarTudo: boolean) => {
    try {
      setIsResetting(true);
      setIsResetConfirmOpen(false);
      await metaApiService.resetarMetas(
        data?.mesReferencia,
        data?.anoReferencia,
        resetarTudo
      );
      await loadData();
      setBonusFeedback('Metas e produções resetadas com sucesso!');
      setTimeout(() => setBonusFeedback(null), 4000);
    } catch {
      setErrorMessage('Erro ao resetar metas. Verifique o console.');
    } finally {
      setIsResetting(false);
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-surface-card border border-surface-border" />
        <div className="h-64 rounded-2xl bg-surface-card border border-surface-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-surface-card border border-surface-border" />
          ))}
        </div>
      </div>
    );
  }

  // Hero Status Card Oficial da Planilha
  const renderStatusHero = () => {
    if (data.statusMeta === 'META_EXCELENCIA') {
      return (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-surface-card border border-yellow-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow-primary animate-fadeIn">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-3xl shadow-inner flex-shrink-0 animate-bounce">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
                  Nível Máximo da Fábrica!
                </span>
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-black border border-yellow-500/40">
                  META EXCELÊNCIA
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Parabéns, Equipe Renetec! Meta Excelência Conquistada ({data.pontosRealizados} pts)
              </h2>
              <p className="text-xs text-gray-300">
                A equipe superou os {data.metaExcelencia} pontos e atingiu 125% do bônus coletivo!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.perfil === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                leftIcon={<Settings2 className="w-3.5 h-3.5" />}
              >
                Ajustar Metas
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (data.statusMeta === 'META_ALVO') {
      return (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-surface-card border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
              🟢
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Meta Alvo Conquistada!
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                  100% BÔNUS COLETIVO GARANTIDO
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                Produção Acumulada: {data.pontosRealizados} pontos realizados
              </h2>
              <p className="text-xs text-gray-300">
                Faltam apenas {data.faltamParaExcelencia} pontos nos próximos {data.diasUteisRestantes} dias úteis para alcançar a Meta Excelência ({data.metaExcelencia} pts).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.perfil === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                leftIcon={<Settings2 className="w-3.5 h-3.5" />}
              >
                Ajustar Metas
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (data.statusMeta === 'META_BASE') {
      return (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 to-surface-card border border-amber-600/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-amber-900/40 border border-amber-600/40 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
              🟡
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Meta Base Atingida
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 text-[10px] font-bold border border-amber-600/40">
                  FALTAM {data.faltamParaAlvo} PTS P/ META ALVO
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {data.pontosRealizados} pontos acumulados • Rumo à Meta Alvo ({data.metaAlvo} pts)
              </h2>
              <p className="text-xs text-gray-400">
                Mais {data.faltamParaAlvo} pontos garantem 100% do bônus coletivo da fábrica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.perfil === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                leftIcon={<Settings2 className="w-3.5 h-3.5" />}
              >
                Ajustar Metas
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Abaixo da Meta
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Em Andamento — {data.nomeMes}/{data.anoReferencia}
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-elevated text-gray-300 text-[10px] font-bold border border-surface-border">
                {data.diasUteisRestantes} DIAS ÚTEIS RESTANTES
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {data.pontosRealizados} de {data.metaAlvo} pontos para a Meta Alvo
            </h2>
            <p className="text-xs text-gray-400">
              Necessário ritmo de <strong className="text-emerald-300">{data.ritmoNecessarioAlvo} pts/dia</strong> para atingir a Meta Alvo e liberar o bônus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.perfil === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigOpen(true)}
              leftIcon={<Settings2 className="w-3.5 h-3.5" />}
            >
              Ajustar Metas
            </Button>
          )}
        </div>
      </div>
    );
  };

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

      {/* ─── NAVEGAÇÃO ENTRE ABAS (EXCLUSIVO PARA ADMIN) ──────────────────── */}
      {user?.perfil === 'ADMIN' && (
        <div className="flex items-center gap-2 border-b border-surface-border/60 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'dashboard'
                ? 'bg-brand-600 text-white shadow-glow-primary'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
            }`}
          >
            <Award className="w-4 h-4" /> Dashboard da Meta
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bonus')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'bonus'
                ? 'bg-brand-600 text-white shadow-glow-primary'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
            }`}
          >
            <Calculator className="w-4 h-4" /> Gestão & Simulador de Bônus
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pontuacao')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'pontuacao'
                ? 'bg-brand-600 text-white shadow-glow-primary'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
            }`}
          >
            <ListOrdered className="w-4 h-4" /> Tabela de Pontuação ({tabelaPontuacao.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guia')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
              activeTab === 'guia'
                ? 'bg-brand-600 text-white shadow-glow-primary'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Como Usar (Guia Operacional)
          </button>

          {/* Separador e botão de reset */}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isResetting}
            className="ml-auto px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-800/30 hover:border-red-700/50 transition-all disabled:opacity-50"
            title="Limpar produções e metas de teste do período"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Resetar
          </button>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMAÇÃO DE RESET ────────────────────────────── */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 bg-surface-card border border-red-800/50 rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Resetar Metas e Produções</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Esta ação é irreversível e apagará os registros de produção, testes e retrabalhos do banco de dados.
                  Use apenas para testes ou fechamento mensal.
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleReset(false)}
                className="w-full px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar Mês Atual ({data?.nomeMes || 'Atual'}/{data?.anoReferencia})
              </button>
              <button
                type="button"
                onClick={() => handleReset(true)}
                className="w-full px-4 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar TODOS os Dados (Completo)
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface-base text-gray-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 1: DASHBOARD DA META ──────────────────────────────────────── */}
      {(activeTab === 'dashboard' || user?.perfil !== 'ADMIN') && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero Status Card */}
          {renderStatusHero()}

          {/* Termômetro Visual Multicamadas em Pontos */}
          <TermometroMetas data={data} />

          {/* Grid de KPIs Semânticos da Planilha */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              label="Pontos Realizados"
              value={data.pontosRealizados}
              unit={`/ ${data.metaAlvo} pts`}
              subtext={`${data.percentualAlvo}% da Meta Alvo`}
              variant="info"
              icon={<Flame className="w-4 h-4" />}
            />
            <KpiCard
              label="Status da Qualidade"
              value={data.statusQualidadeLabel}
              unit={`(${data.taxaRetrabalho}%)`}
              subtext={`Limite máx: ${data.limiteRetrabalhoPct}% de retrabalho`}
              variant={data.statusQualidade === 'DENTRO_DA_META' ? 'success' : 'warning'}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <KpiCard
              label="Faturamento Lançado"
              value={formatBRL(data.faturamentoLancado)}
              subtext={`${data.totalLancamentos} serviços/OSs registradas`}
              variant="default"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KpiCard
              label="Bônus Potencial"
              value={formatBRL(data.bonusFinal)}
              unit={`(${data.multiplicadorBonus}x)`}
              subtext={
                data.multiplicadorBonus > 0
                  ? `Multiplicador de ${data.multiplicadorBonus}x aplicado`
                  : 'Abaixo de 90% do alvo (Sem bônus)'
              }
              variant={data.bonusFinal > 0 ? 'success' : 'default'}
              icon={<Award className="w-4 h-4" />}
            />
          </div>

          {/* Grid de Ritmo Diário e Dias Úteis */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              label="Ritmo Diário Atual"
              value={data.ritmoAtual}
              unit="pts/dia"
              subtext={`${data.diasUteisDecorridos} dias úteis trabalhados`}
              variant="info"
              icon={<Zap className="w-4 h-4" />}
            />
            <KpiCard
              label="Ritmo p/ Meta Alvo"
              value={data.ritmoNecessarioAlvo}
              unit="pts/dia"
              subtext={`Restam ${data.diasUteisRestantes} dias úteis`}
              variant={data.ritmoNecessarioAlvo <= data.ritmoAtual ? 'success' : 'warning'}
              icon={<Flame className="w-4 h-4" />}
            />
            <KpiCard
              label="Projeção de Fechamento"
              value={data.projecaoFechamento}
              unit="pontos"
              subtext={
                data.projecaoFechamento >= data.metaExcelencia
                  ? 'Projeção atinge Meta Excelência! 🎉'
                  : data.projecaoFechamento >= data.metaAlvo
                  ? 'Projeção atinge Meta Alvo'
                  : 'Projeção na Meta Base'
              }
              variant={data.projecaoFechamento >= data.metaAlvo ? 'success' : 'default'}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label="Dias Úteis no Mês"
              value={`${data.diasUteisDecorridos}/${data.diasUteisTotais}`}
              unit="dias"
              subtext={`${data.diasUteisRestantes} dias até o fechamento`}
              variant="default"
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>

          {/* Tabela Oficial: Produção por Técnico (Planilha: Dashboard R14-R20) */}
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-400" /> Produção por Técnico / Colaborador
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Consolidado da pontuação e participação de cada membro da equipe Renetec.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Atualizar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated/60 text-gray-400 font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Pessoa</th>
                    <th className="py-2.5 px-3">Função</th>
                    <th className="py-2.5 px-3 text-right">Pontos Realizados</th>
                    <th className="py-2.5 px-3 text-right">% do Total</th>
                    <th className="py-2.5 px-3 text-center">Peso Bônus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {data.equipe.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-400" />
                        {c.nome}
                      </td>
                      <td className="py-3 px-3 text-gray-300">{c.funcao}</td>
                      <td className="py-3 px-3 text-right font-black text-amber-300 tabular-nums">
                        {c.pontosRealizados} pts
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-300 tabular-nums">
                        {c.percentualTotal}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-surface-elevated text-gray-300 font-semibold border border-surface-border">
                          {c.pesoBonusPercentual}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-elevated/80 font-bold text-white border-t-2 border-surface-border">
                    <td className="py-2.5 px-3">Total Geral</td>
                    <td className="py-2.5 px-3 text-gray-400">—</td>
                    <td className="py-2.5 px-3 text-right text-yellow-400 font-black tabular-nums">
                      {data.pontosRealizados} pts
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-300 tabular-nums">100%</td>
                    <td className="py-2.5 px-3 text-center text-gray-300">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 2: SIMULADOR E DISTRIBUIÇÃO DE BÔNUS (EXCLUSIVO ADMIN) ───── */}
      {user?.perfil === 'ADMIN' && activeTab === 'bonus' && (() => {
        const numFaturamento = (() => {
          if (!simuladorFaturamento) return data.faturamentoBaseCalculo || 0;
          const cl = simuladorFaturamento.trim().replace(/^R\$\s?/, '').replace(/\./g, '').replace(',', '.');
          const val = parseFloat(cl);
          return isNaN(val) ? (data.faturamentoBaseCalculo || 0) : val;
        })();

        const fundoPotencialSimulado = Number((numFaturamento * 0.015).toFixed(2));
        const multSimulado = cenarioSimulacao === 'ALVO'
          ? 1.0
          : cenarioSimulacao === 'EXCELENCIA'
          ? 1.25
          : cenarioSimulacao === 'BASE'
          ? 0.5
          : data.multiplicadorBonus;

        const bonusFinalSimulado = Number((fundoPotencialSimulado * multSimulado).toFixed(2));
        const parteColetivaSimulada = Number((bonusFinalSimulado * 0.70).toFixed(2));
        const parteIndividualSimulada = Number((bonusFinalSimulado * 0.30).toFixed(2));

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Formulário de Simulação de Faturamento */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-400" /> Simulador e Gestão do Fundo de Bônus
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Informe o faturamento recebido e selecione o cenário de atingimento para simular o rateio do fundo (1,5%).
                  </p>
                </div>

                {bonusFeedback && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{bonusFeedback}</span>
                  </div>
                )}
              </div>

              {/* Seletor de Cenário de Simulação */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Cenário de Atingimento da Meta para Simulação:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCenarioSimulacao('ALVO')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      cenarioSimulacao === 'ALVO'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-glow-primary'
                        : 'bg-surface-base border-surface-border text-gray-400 hover:text-white hover:bg-surface-elevated'
                    }`}
                  >
                    <span>🎯 Meta Alvo (100%)</span>
                    <span className="text-[10px] font-mono opacity-80">Multiplicador 1,0x</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenarioSimulacao('EXCELENCIA')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      cenarioSimulacao === 'EXCELENCIA'
                        ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-glow-primary'
                        : 'bg-surface-base border-surface-border text-gray-400 hover:text-white hover:bg-surface-elevated'
                    }`}
                  >
                    <span>🏆 Excelência (110%+)</span>
                    <span className="text-[10px] font-mono opacity-80">Multiplicador 1,25x</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenarioSimulacao('BASE')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      cenarioSimulacao === 'BASE'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-glow-primary'
                        : 'bg-surface-base border-surface-border text-gray-400 hover:text-white hover:bg-surface-elevated'
                    }`}
                  >
                    <span>🟡 Meta Base (90%)</span>
                    <span className="text-[10px] font-mono opacity-80">Multiplicador 0,5x</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCenarioSimulacao('REAL')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      cenarioSimulacao === 'REAL'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-primary'
                        : 'bg-surface-base border-surface-border text-gray-400 hover:text-white hover:bg-surface-elevated'
                    }`}
                  >
                    <span>📊 Real Atual ({data.percentualAlvo}%)</span>
                    <span className="text-[10px] font-mono opacity-80">Multiplicador {data.multiplicadorBonus}x</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSimularFaturamento} className="flex flex-col sm:flex-row items-end gap-3 pt-2">
                <div className="w-full sm:w-80 space-y-1">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Faturamento Recebido no Mês (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={simuladorFaturamento}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.,]/g, '');
                      setSimuladorFaturamento(v);
                    }}
                    placeholder="Ex: 3000000.00"
                    className="w-full bg-surface-base border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-bold tabular-nums"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isUpdatingBonus}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                >
                  Salvar Faturamento
                </Button>
              </form>
            </div>

            {/* Cards de Métricas do Bônus Simulado */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Fundo Potencial (1,5%)
                </span>
                <div className="text-2xl font-black text-white tabular-nums">
                  {formatBRL(fundoPotencialSimulado)}
                </div>
                <p className="text-[11px] text-gray-400">1,5% de {formatBRL(numFaturamento)}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Multiplicador Simulado
                </span>
                <div className="text-2xl font-black text-amber-300 tabular-nums">
                  {multSimulado}x
                </div>
                <p className="text-[11px] text-gray-400">
                  Cenário: {cenarioSimulacao === 'ALVO' ? 'Meta Alvo (100%)' : cenarioSimulacao === 'EXCELENCIA' ? 'Excelência (110%+)' : cenarioSimulacao === 'BASE' ? 'Meta Base (90%)' : 'Real Atual'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Parte Coletiva (70%)
                </span>
                <div className="text-2xl font-black text-sky-400 tabular-nums">
                  {formatBRL(parteColetivaSimulada)}
                </div>
                <p className="text-[11px] text-gray-400">70% do bônus final rateado</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Parte Individual (30%)
                </span>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">
                  {formatBRL(parteIndividualSimulada)}
                </div>
                <p className="text-[11px] text-gray-400">30% condicionado à meta individual</p>
              </div>
            </div>

            {/* Tabela de Distribuição do Bônus por Colaborador */}
            <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Distribuição de Bônus por Colaborador
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Rateio proporcional aos pesos oficiais cadastrados na planilha Renetec.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-gray-300">
                  Bônus Final Simulado: <strong className="text-emerald-400 font-mono text-sm ml-1">{formatBRL(bonusFinalSimulado)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-elevated/60 text-gray-400 font-semibold border-b border-surface-border">
                    <tr>
                      <th className="py-2.5 px-3">Pessoa</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3 text-center">Peso</th>
                      <th className="py-2.5 px-3 text-right">Bônus Coletivo (70%)</th>
                      <th className="py-2.5 px-3 text-right">Bônus Individual (30%)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-white">Bônus Total</th>
                      <th className="py-2.5 px-3 text-center">Meta Individual Cumprida?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {data.equipe.map((c) => {
                      const pesoFrac = c.pesoBonusPercentual / 100;
                      const colColetivo = Number((parteColetivaSimulada * pesoFrac).toFixed(2));
                      const colIndividual = c.metaIndividualCumprida ? Number((parteIndividualSimulada * pesoFrac).toFixed(2)) : 0;
                      const colTotal = Number((colColetivo + colIndividual).toFixed(2));

                      return (
                        <tr key={c.id} className="hover:bg-surface-elevated/30 transition-colors">
                          <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {c.nome}
                          </td>
                          <td className="py-3 px-3 text-gray-300">{c.funcao}</td>
                          <td className="py-3 px-3 text-center font-bold text-gray-200">
                            {c.pesoBonusPercentual}%
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-sky-300 tabular-nums font-mono">
                            {formatBRL(colColetivo)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-300 tabular-nums font-mono">
                            {formatBRL(colIndividual)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-300 tabular-nums text-sm font-mono">
                            {formatBRL(colTotal)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleMetaIndividual(c.id, c.metaIndividualCumprida)}
                              disabled={user?.perfil !== 'ADMIN'}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                c.metaIndividualCumprida
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                            >
                              {c.metaIndividualCumprida ? '✓ Sim' : '✕ Não'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-surface-elevated/80 font-bold text-white border-t-2 border-surface-border">
                      <td className="py-2.5 px-3">Total Distribuído</td>
                      <td className="py-2.5 px-3 text-gray-400">—</td>
                      <td className="py-2.5 px-3 text-center font-bold">100%</td>
                      <td className="py-2.5 px-3 text-right text-sky-300 tabular-nums font-black font-mono">
                        {formatBRL(parteColetivaSimulada)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-300 tabular-nums font-black font-mono">
                        {formatBRL(parteIndividualSimulada)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 tabular-nums font-black text-sm font-mono">
                        {formatBRL(bonusFinalSimulado)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regras do Multiplicador Explicadas */}
            <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-surface-border space-y-2 text-xs text-gray-300">
              <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-brand-400" /> Tabela de Escalonamento do Multiplicador de Bônus Oficial:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                  <span className="font-bold text-rose-400">Abaixo de 90%</span>
                  <p className="text-gray-400 mt-0.5">Multiplicador: <strong className="text-white">0x (0%)</strong></p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                  <span className="font-bold text-amber-400">90% a 99,9%</span>
                  <p className="text-gray-400 mt-0.5">Multiplicador: <strong className="text-white">0,5x (50%)</strong></p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                  <span className="font-bold text-emerald-400">100% a 109,9%</span>
                  <p className="text-gray-400 mt-0.5">Multiplicador: <strong className="text-white">1,0x (100%)</strong></p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-card border border-surface-border">
                  <span className="font-bold text-yellow-400">A partir de 110%</span>
                  <p className="text-gray-400 mt-0.5">Multiplicador: <strong className="text-white">1,25x (125%)</strong></p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── ABA 3: TABELA OFICIAL DE PONTUAÇÃO (EXCLUSIVO ADMIN) ─────────── */}
      {user?.perfil === 'ADMIN' && activeTab === 'pontuacao' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-amber-400" /> Tabela Oficial de Pontuação — Renetec 2026
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Valores de pontos unitários atribuídos para cada família de equipamento e complexidade de reparo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-elevated/60 text-gray-400 font-semibold border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Serviço / Equipamento</th>
                    <th className="py-2.5 px-3 text-center">Pontos por Unidade</th>
                    <th className="py-2.5 px-3">Observação / Complexidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {tabelaPontuacao.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{t.equipamentoServico}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-black border border-amber-500/30 tabular-nums">
                          {t.pontos} pt{t.pontos > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300">{t.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border text-xs text-gray-300">
              <strong className="text-amber-300">IMPORTANTE:</strong> A pontuação é inicial e deve ser revisada após o período piloto de agosto conforme os dados de chão de fábrica.
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 4: GUIA COMO USAR (EXCLUSIVO ADMIN) ──────────────────────── */}
      {user?.perfil === 'ADMIN' && activeTab === 'guia' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" /> Como Administrar a Meta Renetec (Guia Oficial)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Diretrizes operacionais para registro de produção, controle de qualidade, retrabalho e bônus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {guiaComoUsar.map((g) => (
                <div
                  key={g.etapa}
                  className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-2 hover:border-brand-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center justify-center text-xs font-black">
                      {g.etapa}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-elevated text-gray-300 text-[10px] font-bold border border-surface-border">
                      {g.quando}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {g.oQueFazer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Metas (Admin) */}
      <ConfigMetaModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentData={data}
        onSuccess={loadData}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApiService } from './dashboard.service';
import type { GerencialResponse } from './dashboard.types';
import { useRealtime } from '../realtime/RealtimeContext';
import { useAuth } from '../auth/AuthContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import {
  BarChart2,
  DollarSign,
  Clock,
  ShieldCheck,
  Users,
  RefreshCw,
  Flame,
  AlertTriangle,
  Archive,
  Calendar,
  Award,
} from 'lucide-react';

export const DashboardGerencialPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<GerencialResponse | null>(null);
  const [periodo, setPeriodo] = useState<string>('mes_atual');
  const [selectedMesAno, setSelectedMesAno] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { subscribe } = useRealtime();

  const loadData = useCallback(async () => {
    try {
      setHasError(false);
      const res = await dashboardApiService.getGerencial(periodo);
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Erro ao carregar Dashboard Gerencial:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadData();
    // Inscrição em eventos em tempo real (atualiza sem necessidade de F5)
    const unsubscribe = subscribe('*', () => {
      loadData();
    });

    const interval = setInterval(loadData, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadData, subscribe]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 rounded-xl bg-surface-card border border-surface-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-surface-card border border-surface-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-surface-card border border-surface-border" />
          <div className="h-64 rounded-xl bg-surface-card border border-surface-border" />
        </div>
      </div>
    );
  }

  if (hasError && !data) {
    return (
      <div className="p-8 rounded-2xl bg-surface-card border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Não foi possível carregar o dashboard</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
            Ocorreu uma instabilidade ao consultar os indicadores operacionais. Tente novamente em instantes.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setIsLoading(true);
            loadData();
          }}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. SELETOR DE PERÍODO & HISTÓRICO MENSAL (ADMIN) ─────────────── */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-500 dark:text-brand-400" /> Indicadores Executivos e Operacionais — Renetec
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Consolidado de faturamento, lead time, qualidade e rendimento em pontos da equipe técnica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap bg-surface-base p-1 rounded-xl border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => { setPeriodo('hoje'); setSelectedMesAno(''); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'hoje'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => { setPeriodo('7_dias'); setSelectedMesAno(''); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === '7_dias'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => { setPeriodo('mes_atual'); setSelectedMesAno(''); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'mes_atual'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => { setPeriodo('mes_anterior'); setSelectedMesAno('mes_anterior'); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                periodo === 'mes_anterior'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Mês Passado
            </button>
            <button
              type="button"
              onClick={() => { setPeriodo('ano'); setSelectedMesAno(''); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'ano'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Ano 2026
            </button>
          </div>

          {/* Seletor de Histórico Mensal para Admin */}
          {user?.perfil === 'ADMIN' && data?.mesesDisponiveis && data.mesesDisponiveis.length > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-base px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline">Histórico:</span>
              <select
                value={selectedMesAno || (periodo === 'mes_anterior' ? 'mes_anterior' : periodo === 'mes_atual' ? 'mes_atual' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMesAno(val);
                  setPeriodo(val);
                }}
                className="bg-transparent text-xs font-bold text-gray-900 dark:text-white outline-none cursor-pointer py-0.5"
              >
                <option value="mes_atual" className="bg-surface-card text-gray-900 dark:text-white">
                  Outubro / 2026 (Mês Atual)
                </option>
                <option value="mes_anterior" className="bg-surface-card text-gray-900 dark:text-white">
                  Setembro / 2026 (Mês Passado - Fechado)
                </option>
                {data.mesesDisponiveis
                  .filter((m) => !m.isAtual && m.key !== '2026-09')
                  .map((m) => (
                    <option key={m.key} value={m.key} className="bg-surface-card text-gray-900 dark:text-white">
                      {m.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* ─── BANNER DE FECHAMENTO MENSAL CONSOLIDADO (ADMIN / MÊS PASSADO) ─── */}
      {data.isMesPassado && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-surface-card border border-amber-500/40 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Histórico & Fechamento Oficial
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-black border border-amber-300 dark:border-amber-500/40">
                    {data.periodoLabel || 'Mês Fechado'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 flex flex-wrap items-center gap-2">
                  Produção Consolidada: {data.pontosTotaisRealizados ?? 0} Pontos Conquistados!
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {data.statusMetaLabel || 'META BASE'}
                  </span>
                </h3>
              </div>
            </div>
            {data.metaBasePeriodo && (
              <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                Meta Base: <span className="font-bold text-gray-900 dark:text-white">{data.metaBasePeriodo} pts</span> | Meta Alvo: <span className="font-bold text-gray-900 dark:text-white">{data.metaAlvoPeriodo} pts</span>
              </div>
            )}
          </div>

          {/* Cards Rápidos de Totais da Fábrica no Mês Fechado */}
          {data.resumoFabrica && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-amber-500/20 text-xs">
              <div className="bg-surface-elevated/70 p-2.5 rounded-xl border border-surface-border text-center">
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{data.resumoFabrica.totalReparados}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Peças Reparadas</p>
              </div>
              <div className="bg-surface-elevated/70 p-2.5 rounded-xl border border-surface-border text-center">
                <p className="text-base font-black text-amber-600 dark:text-amber-400">{data.resumoFabrica.totalSucata}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Sucatas</p>
              </div>
              <div className="bg-surface-elevated/70 p-2.5 rounded-xl border border-surface-border text-center">
                <p className="text-base font-black text-sky-600 dark:text-sky-400">{data.resumoFabrica.totalSemDefeito}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Sem Defeito</p>
              </div>
              <div className="bg-surface-elevated/70 p-2.5 rounded-xl border border-surface-border text-center">
                <p className="text-base font-black text-rose-600 dark:text-rose-400">{data.resumoFabrica.totalRetrabalho}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Retrabalhos</p>
              </div>
              <div className="bg-surface-elevated/70 p-2.5 rounded-xl border border-surface-border text-center col-span-2 sm:col-span-1">
                <p className="text-base font-black text-brand-600 dark:text-brand-400">{data.resumoFabrica.totalLancamentos}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">Lançamentos</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 2. CARDS EXECUTIVOS DE TOPO ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Faturamento Lançado"
          value={formatCurrency(data.faturamentoEstimado)}
          subtext={`${data.totalOsAtivas} OSs registradas`}
          variant="success"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          label="Pontos Realizados"
          value={data.pontosTotaisRealizados ?? 0}
          unit={`/ ${data.metaAlvoPeriodo ?? 300} pts`}
          subtext="Meta ponderada da fábrica"
          variant="default"
          icon={<Flame className="w-4 h-4 text-amber-400" />}
        />
        <KpiCard
          label="FPY Médio (Qualidade)"
          value={`${data.fpyGeral}%`}
          subtext="Aprovação direta no CQ (0% retrabalho)"
          variant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <KpiCard
          label="Lead Time Médio"
          value={data.leadTimeMedioGeralMinutos}
          unit="min/lote"
          subtext="Tempo de montagem/reparo"
          variant="warning"
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* ─── 3. DESEMPENHO POR TÉCNICO ───────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Desempenho por Técnico
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Quantidade de reparados, sem defeito, sucata e retrabalhos por colaborador no período selecionado.
          </p>
        </div>

        {data.desempenhoTecnicos && data.desempenhoTecnicos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.desempenhoTecnicos.map((tec) => {
              const isQualidade = tec.funcao?.toLowerCase().includes('qualidade') || tec.funcao?.toLowerCase().includes('testes');
              const totalItens = isQualidade
                ? (tec.testados || 0)
                : ((tec.reparados || 0) + (tec.semDefeito || 0) + (tec.sucata || 0) + (tec.retrabalhos || 0));

              return (
                <div
                  key={tec.tecnicoId}
                  className="p-4 rounded-xl bg-surface-elevated/50 border border-surface-border hover:border-violet-500/30 transition-all duration-200 space-y-3"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${
                        isQualidade
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                          : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}>
                        {tec.tecnicoNome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {tec.tecnicoNome}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                          {tec.funcao || 'Produção'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tec.pontos !== undefined && (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {tec.pontos} pts
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-surface-base px-2 py-0.5 rounded-md border border-surface-border">
                        {totalItens} un
                      </span>
                    </div>
                  </div>

                  {/* Métricas */}
                  {isQualidade ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <p className="text-lg font-black text-cyan-600 dark:text-cyan-400 tabular-nums">{tec.testados || 0}</p>
                          <p className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase">Testados</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{tec.aprovados || 0}</p>
                          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Aprovados</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <p className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">{tec.reprovados || 0}</p>
                          <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">Reprovados</p>
                        </div>
                      </div>
                      {/* Barra visual de aprovação */}
                      {tec.testados > 0 && (
                        <div className="w-full bg-surface-base rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.aprovados || 0) / tec.testados) * 100}%` }}
                          />
                          <div
                            className="bg-rose-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.reprovados || 0) / tec.testados) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{tec.reparados || 0}</p>
                          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Reparados</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">{tec.sucata || 0}</p>
                          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">Sucata</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                          <p className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">{tec.semDefeito || 0}</p>
                          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase">Sem Defeito</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <p className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">{tec.retrabalhos || 0}</p>
                          <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">Retrabalhos</p>
                        </div>
                      </div>
                      {/* Barra visual proporcional */}
                      {totalItens > 0 && (
                        <div className="w-full bg-surface-base rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.reparados || 0) / totalItens) * 100}%` }}
                          />
                          <div
                            className="bg-sky-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.semDefeito || 0) / totalItens) * 100}%` }}
                          />
                          <div
                            className="bg-amber-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.sucata || 0) / totalItens) * 100}%` }}
                          />
                          <div
                            className="bg-rose-500 h-1.5 transition-all duration-500"
                            style={{ width: `${((tec.retrabalhos || 0) / totalItens) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 bg-surface-elevated/40 rounded-xl border border-surface-border">
            Nenhum dado de desempenho disponível para o período selecionado.
          </div>
        )}
      </div>

      {/* ─── 4. RANKING DE PRODUTIVIDADE DOS TÉCNICOS ──────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Produtividade e Rendimento da Equipe Renetec
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Acompanhamento individual de pontos realizados, participação e peso de bônus.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-elevated/60 text-gray-600 dark:text-gray-400 font-semibold border-b border-surface-border">
              <tr>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3 text-right">Pontos Realizados</th>
                <th className="py-2.5 px-3 text-right">% do Total</th>
                <th className="py-2.5 px-3 text-center">Peso de Bônus</th>
                <th className="py-2.5 px-3 text-center">Taxa de Aprovação (FPY)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.produtividadeTecnicos && data.produtividadeTecnicos.length > 0 ? (
                data.produtividadeTecnicos.map((tec) => (
                  <tr key={tec.tecnicoId} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {tec.tecnicoNome}
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{tec.funcao ?? 'Produção'}</td>
                    <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-300 tabular-nums">
                      {tec.pontosRealizados ?? tec.totalProduzido ?? 0} pts
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {tec.percentualTotal ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated text-gray-700 dark:text-gray-300 font-semibold border border-surface-border">
                        {tec.pesoBonus ? `${(tec.pesoBonus * 100).toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                        {tec.taxaAprovacao}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhum colaborador registrado no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApiService } from './dashboard.service';
import type { GerencialResponse } from './dashboard.types';
import { useRealtime } from '../realtime/RealtimeContext';
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
  Cpu,
  Layers,
} from 'lucide-react';

export const DashboardGerencialPage: React.FC = () => {
  const [data, setData] = useState<GerencialResponse | null>(null);
  const [periodo, setPeriodo] = useState<string>('mes_atual');
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
          <h3 className="text-base font-bold text-white">Não foi possível carregar o dashboard</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md">
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
      {/* ─── 1. SELETOR DE PERÍODO & AÇÕES ───────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-400" /> Indicadores Executivos e Operacionais — Renetec
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Consolidado de faturamento, lead time, qualidade e rendimento em pontos da equipe técnica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface-base p-1 rounded-xl border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setPeriodo('hoje')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'hoje' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('7_dias')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === '7_dias' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('mes_atual')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'mes_atual' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                periodo === 'ano' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Ano 2026
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar
          </Button>
        </div>
      </div>

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

      {/* ─── 3. GRÁFICOS: PARETO DE DEFEITOS & LEAD TIME POR EQUIPAMENTO ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuição de Defeitos (Pareto de Retrabalhos) */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" /> Distribuição de Defeitos (Retrabalhos)
            </h3>
            <span className="text-[11px] text-gray-400 font-mono">Taxa: {data.taxaRetrabalho}%</span>
          </div>

          {data.distribuicaoDefeitos && data.distribuicaoDefeitos.length > 0 ? (
            <div className="space-y-3">
              {data.distribuicaoDefeitos.slice(0, 5).map((def, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300 truncate">{def.motivo}</span>
                    <span className="text-rose-400 tabular-nums font-mono">{def.quantidade} un ({def.percentual}%)</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, def.percentual)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-400 bg-surface-elevated/40 rounded-xl border border-surface-border">
              Nenhum defeito registrado no período selecionado. Excelente controle de qualidade!
            </div>
          )}
        </div>

        {/* Lead Time por Tipo de Equipamento */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Lead Time por Equipamento
            </h3>
            <span className="text-[11px] text-gray-400 font-mono">Média: {data.leadTimeMedioGeralMinutos} min</span>
          </div>

          {data.leadTimePorEquipamento && data.leadTimePorEquipamento.length > 0 ? (
            <div className="space-y-3">
              {data.leadTimePorEquipamento.slice(0, 5).map((eq, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300 truncate">{eq.tipoEquipamentoNome}</span>
                    <span className="text-cyan-400 tabular-nums font-mono">{eq.tempoMedioMinutos} min ({eq.quantidadeConcluida} un)</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (eq.tempoMedioMinutos / 120) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-400 bg-surface-elevated/40 rounded-xl border border-surface-border">
              Aguardando conclusão de ordens de serviço para cálculo de lead time por modelo.
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. RANKING DE PRODUTIVIDADE DOS TÉCNICOS ──────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Produtividade e Rendimento da Equipe Renetec
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Acompanhamento individual de pontos realizados, participação e peso de bônus.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-elevated/60 text-gray-400 font-semibold border-b border-surface-border">
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
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {tec.tecnicoNome}
                    </td>
                    <td className="py-3 px-3 text-gray-300">{tec.funcao ?? 'Produção'}</td>
                    <td className="py-3 px-3 text-right font-black text-amber-300 tabular-nums">
                      {tec.pontosRealizados ?? tec.totalProduzido ?? 0} pts
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-300 tabular-nums">
                      {tec.percentualTotal ?? 0}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-surface-elevated text-gray-300 font-semibold border border-surface-border">
                        {tec.pesoBonus ? `${(tec.pesoBonus * 100).toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                        {tec.taxaAprovacao}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
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


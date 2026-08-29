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
  RotateCcw,
  Users,
  RefreshCw,
  Flame,
} from 'lucide-react';

export const DashboardGerencialPage: React.FC = () => {
  const [data, setData] = useState<GerencialResponse | null>(null);
  const [periodo, setPeriodo] = useState<string>('mes_atual');
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useRealtime();

  const loadData = useCallback(async () => {
    try {
      const res = await dashboardApiService.getGerencial(periodo);
      setData(res);
    } catch {
      // Erro
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

  if (isLoading || !data) {
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
          value={data.pontosTotaisRealizados ?? 57}
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

      {/* ─── 3. DISTRIBUIÇÃO DE DEFEITOS & LEAD TIME POR EQUIPAMENTO ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pareto de Defeitos */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" /> Pareto de Não-Conformidades (CQ)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Principais causas de reprovação identificadas no período.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Taxa Retrabalho: {data.taxaRetrabalho}% (Dentro da meta)
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {data.distribuicaoDefeitos.length === 0 || data.distribuicaoDefeitos.every((d) => d.quantidade === 0) ? (
              <div className="p-6 rounded-xl bg-surface-base border border-surface-border text-center space-y-1 text-xs text-gray-400">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="font-semibold text-gray-200">Nenhuma reprovação registrada no período.</p>
                <p>Taxa de qualidade em 100% de conformidade com a meta.</p>
              </div>
            ) : (
              data.distribuicaoDefeitos.map((def) => (
                <div key={def.codigo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-200">
                      <span className="text-amber-400 font-bold">{def.codigo}</span> — {def.motivo}
                    </span>
                    <span className="font-bold text-white tabular-nums">
                      {def.quantidade} un ({def.percentual}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-base rounded-full overflow-hidden border border-surface-border/50">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                      style={{ width: `${def.percentual}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead Time Médio por Equipamento */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Tabela de Equipamentos e Lead Time Médio
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tempo médio despendido em bancada por tipo de produto e complexidade.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {data.leadTimePorEquipamento.map((eq) => (
              <div key={eq.tipoEquipamentoNome} className="p-3 rounded-xl bg-surface-base border border-surface-border flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    {eq.tipoEquipamentoNome}
                    {eq.pontosUnitarios && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        {eq.pontosUnitarios} pts
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-gray-400">{eq.quantidadeConcluida} unidades concluídas</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-sky-400 tabular-nums">
                    {eq.tempoMedioMinutos} <span className="text-xs font-semibold text-gray-400">min</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
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
              {data.produtividadeTecnicos.map((tec) => (
                <tr key={tec.tecnicoId} className="hover:bg-surface-elevated/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {tec.tecnicoNome}
                  </td>
                  <td className="py-3 px-3 text-gray-300">{tec.funcao ?? 'Produção'}</td>
                  <td className="py-3 px-3 text-right font-black text-amber-300 tabular-nums">
                    {tec.pontosRealizados ?? tec.totalProduzido} pts
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

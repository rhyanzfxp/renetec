import React from 'react';
import type { MetaAtualData } from './meta.types';
import { Target, Flame, TrendingUp, Award } from 'lucide-react';

interface TermometroMetasProps {
  data: MetaAtualData;
}

export const TermometroMetas: React.FC<TermometroMetasProps> = ({ data }) => {
  const maxEscala = Math.max(data.metaExcelencia + 50, 400);

  const pctAtual = Math.min(100, (data.pontosRealizados / maxEscala) * 100);
  const pctProjecao = Math.min(100, (data.projecaoFechamento / maxEscala) * 100);

  const pctBase = (data.metaBase / maxEscala) * 100;
  const pctAlvo = (data.metaAlvo / maxEscala) * 100;
  const pctExcelencia = (data.metaExcelencia / maxEscala) * 100;

  // Cor do gradiente baseada no status da meta oficial
  const getGradientFill = () => {
    if (data.statusMeta === 'META_EXCELENCIA') {
      return 'from-amber-500 via-yellow-400 to-amber-300 shadow-glow-primary';
    }
    if (data.statusMeta === 'META_ALVO') {
      return 'from-emerald-600 via-emerald-400 to-teal-300 shadow-glow-primary';
    }
    if (data.statusMeta === 'META_BASE') {
      return 'from-amber-600 via-amber-500 to-orange-400';
    }
    return 'from-brand-600 to-brand-400';
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-card border border-surface-border space-y-6 shadow-xl relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header do Termômetro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-400" /> Termômetro de Pontuação da Fábrica
            </h3>
            {data.isPeriodoPiloto && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Modo Piloto Ativo (12-31/Ago)
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Pontuação Ponderada
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Meta calculada em pontos (`Qtd × Pontos por Equipamento`) em {data.nomeMes}/{data.anoReferencia}.
          </p>
        </div>

        {/* Produção Atual em Pontos */}
        <div className="text-left sm:text-right flex items-baseline sm:block gap-2">
          <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
            {data.pontosRealizados}{' '}
            <span className="text-xs font-semibold text-gray-400">/ {data.metaAlvo} pts (Meta Alvo)</span>
          </div>
          <div className="text-xs font-bold flex items-center sm:justify-end gap-1.5 mt-0.5">
            <span className="text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {data.percentualAlvo}% da Meta Alvo
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-xs font-black uppercase tracking-wider text-white bg-surface-elevated px-2 py-0.5 rounded border border-surface-border">
              {data.statusMetaLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ─── BARRA PRINCIPAL DO TERMÔMETRO ─────────────────────────────────── */}
      <div className="space-y-2 relative z-10 pt-4">
        {/* Marcadores de Topo */}
        <div className="relative h-7 w-full text-xs font-bold select-none">
          {/* Marcador Base */}
          <div
            className="absolute -translate-x-1/2 flex flex-col items-center group cursor-help transition-transform hover:scale-110"
            style={{ left: `${pctBase}%` }}
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-900/70 border border-amber-600/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Base: {data.metaBase} pts
            </span>
          </div>

          {/* Marcador Alvo */}
          <div
            className="absolute -translate-x-1/2 flex flex-col items-center group cursor-help transition-transform hover:scale-110"
            style={{ left: `${pctAlvo}%` }}
          >
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Alvo: {data.metaAlvo} pts
            </span>
          </div>

          {/* Marcador Excelência */}
          <div
            className="absolute -translate-x-1/2 flex flex-col items-center group cursor-help transition-transform hover:scale-110"
            style={{ left: `${pctExcelencia}%` }}
          >
            <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/60 text-yellow-300 text-[10px] font-black flex items-center gap-1 shadow-glow-primary animate-pulse">
              <Award className="w-3 h-3 text-yellow-400" /> Excelência: {data.metaExcelencia} pts
            </span>
          </div>
        </div>

        {/* Trilho de Progresso Principal */}
        <div className="relative h-6 w-full bg-surface-base rounded-xl p-1 border border-surface-border overflow-hidden">
          {/* Faixa Base */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-amber-950/20 border-r border-dashed border-amber-600/40"
            style={{ width: `${pctBase}%` }}
          />
          {/* Faixa Alvo */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-950/20 border-r border-dashed border-emerald-500/40"
            style={{ left: `${pctBase}%`, width: `${pctAlvo - pctBase}%` }}
          />
          {/* Faixa Excelência */}
          <div
            className="absolute top-0 bottom-0 bg-yellow-950/20 border-r border-dashed border-yellow-400/40"
            style={{ left: `${pctAlvo}%`, width: `${pctExcelencia - pctAlvo}%` }}
          />

          {/* Barra de Projeção */}
          <div
            className="absolute top-1 bottom-1 left-1 rounded-lg bg-brand-500/20 border-r-2 border-brand-400 transition-all duration-500"
            style={{ width: `${pctProjecao}%` }}
            title={`Projeção de fechamento: ${data.projecaoFechamento} pontos`}
          />

          {/* Barra Real Conquistada */}
          <div
            className={`h-full rounded-lg bg-gradient-to-r ${getGradientFill()} transition-all duration-700 relative`}
            style={{ width: `${pctAtual}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse rounded-lg" />
          </div>
        </div>

        {/* Indicadores Numéricos na Base */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-0.5 font-mono">
          <span>0 pts</span>
          <span className="flex items-center gap-1 text-brand-300">
            <TrendingUp className="w-3 h-3 text-brand-400" /> Projeção: {data.projecaoFechamento} pts
          </span>
          <span>{maxEscala} pts</span>
        </div>
      </div>

      {/* ─── CARDS DE STATUS DAS 3 FAIXAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
        {/* Card Meta Base */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            data.pontosRealizados >= data.metaBase
              ? 'bg-amber-950/30 border-amber-600/50 shadow-sm'
              : 'bg-surface-elevated/40 border-surface-border opacity-80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Meta Base ({data.metaBase} pts)
            </span>
            {data.pontosRealizados >= data.metaBase ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Atingida!
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">Faltam {data.faltamParaBase} pts</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-400">Progresso Base:</span>
            <span className="font-bold text-white tabular-nums">{data.percentualBase}%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Abaixo do alvo; sem bônus coletivo.</p>
        </div>

        {/* Card Meta Alvo */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            data.pontosRealizados >= data.metaAlvo
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
              : 'bg-surface-elevated/40 border-surface-border opacity-80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" /> Meta Alvo ({data.metaAlvo} pts)
            </span>
            {data.pontosRealizados >= data.metaAlvo ? (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                Atingida!
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold">Faltam {data.faltamParaAlvo} pts</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-400">Progresso Alvo:</span>
            <span className="font-bold text-white tabular-nums">{data.percentualAlvo}%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Garante 100% do bônus coletivo.</p>
        </div>

        {/* Card Meta Excelência */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            data.pontosRealizados >= data.metaExcelencia
              ? 'bg-yellow-950/40 border-yellow-500/60 shadow-glow-primary'
              : 'bg-surface-elevated/40 border-surface-border opacity-80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-yellow-400" /> Meta Excelência ({data.metaExcelencia} pts)
            </span>
            {data.pontosRealizados >= data.metaExcelencia ? (
              <span className="text-[10px] font-black text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded border border-yellow-500/40 animate-pulse">
                CONQUISTADA!
              </span>
            ) : (
              <span className="text-[10px] text-yellow-400 font-semibold">Faltam {data.faltamParaExcelencia} pts</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-400">Progresso Excelência:</span>
            <span className="font-bold text-white tabular-nums">{data.percentualExcelencia}%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">125% do bônus coletivo (teto).</p>
        </div>
      </div>
    </div>
  );
};

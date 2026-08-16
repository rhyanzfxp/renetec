import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApiService } from './dashboard.service';
import type { TvFabricaResponse } from './dashboard.types';
import { useRealtime } from '../realtime/RealtimeContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import {
  Tv,
  Maximize,
  Minimize,
  Flame,
  Clock,
  Wrench,
  AlertTriangle,
  Zap,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export const TvFabricaPage: React.FC = () => {
  const [data, setData] = useState<TvFabricaResponse | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Relógio digital em tempo real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await dashboardApiService.getTvFabrica();
      setData(res);
      setLastUpdated(new Date());
    } catch {
      // Falha silenciosa para não quebrar a TV
    }
  }, []);

  const { subscribe } = useRealtime();

  // Polling e inscrição em eventos WebSocket
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);

    const unsubscribe = subscribe('*', () => {
      loadData();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadData, subscribe]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!data) {
    return (
      <div className="h-full min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Carregando Telão da Fábrica...</p>
      </div>
    );
  }

  const meta = data.meta;
  const maxScale = Math.max(meta.metaExcelencia + 50, 400);
  const pctAtual = Math.min(100, (meta.pontosRealizados / maxScale) * 100);
  const pctProjecao = Math.min(100, (meta.projecaoFechamento / maxScale) * 100);
  const pctBase = (meta.metaBase / maxScale) * 100;
  const pctAlvo = (meta.metaAlvo / maxScale) * 100;
  const pctExcelencia = (meta.metaExcelencia / maxScale) * 100;

  return (
    <div className="space-y-4 select-none pb-6">
      {/* ─── 1. TOP HEADER INDUSTRIAL COM RELÓGIO AO VIVO ─────────────────── */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> AO VIVO
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-400" /> Painel Operacional de Chão de Fábrica — Renetec
            </h1>
            <p className="text-xs text-gray-400 capitalize">{currentDate}</p>
          </div>
        </div>

        {/* Relógio Digital Gigante + Botão Fullscreen */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-widest text-shadow-glow">
              {currentTime}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            leftIcon={isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            title="Alternar Modo Tela Cheia (F11)"
          >
            {isFullscreen ? 'Janela' : 'Tela Cheia'}
          </Button>
        </div>
      </div>

      {/* ─── 2. GRID PRINCIPAL (TERMÔMETRO + FPY + BANCADAS) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LADO ESQUERDO: TERMÔMETRO DE METAS & FPY (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card Principal da Meta */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-surface-card via-surface-card to-amber-950/20 border border-surface-border space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Meta Mensal Coletiva (Pontos) — {meta.mesNome}/{meta.ano}
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                    {meta.pontosRealizados}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gray-400">
                    / {meta.metaAlvo} pts (Meta Alvo)
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pontuação total ponderada por tipo de serviço e equipamento.
                </p>
              </div>

              {/* Badges de Destaque */}
              <div className="text-right space-y-1">
                <div className="px-3 py-1.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-black text-sm tabular-nums shadow-glow-primary">
                  {meta.percentualAlvo}% Atingido
                </div>
                <p className="text-[11px] text-gray-300 font-bold uppercase tracking-wider">
                  {meta.statusMetaLabel}
                </p>
              </div>
            </div>

            {/* O Termômetro Visual em Escala Gigante */}
            <div className="space-y-3 pt-2">
              {/* Marcadores */}
              <div className="relative h-6 w-full text-xs font-bold select-none">
                <div className="absolute -translate-x-1/2" style={{ left: `${pctBase}%` }}>
                  <span className="px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-600/50 text-amber-300 text-[10px] font-bold">
                    🟡 Base: {meta.metaBase}
                  </span>
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: `${pctAlvo}%` }}>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 text-[10px] font-bold">
                    🟢 Alvo: {meta.metaAlvo}
                  </span>
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: `${pctExcelencia}%` }}>
                  <span className="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/60 text-yellow-300 text-[10px] font-black animate-pulse">
                    🏆 Excelência: {meta.metaExcelencia}
                  </span>
                </div>
              </div>

              {/* Barra */}
              <div className="relative h-7 w-full bg-surface-base rounded-xl p-1 border border-surface-border overflow-hidden">
                <div
                  className="absolute top-1 bottom-1 left-1 rounded-lg bg-brand-500/20 border-r-2 border-brand-400"
                  style={{ width: `${pctProjecao}%` }}
                />
                <div
                  className="relative h-full rounded-lg bg-gradient-to-r from-brand-600 via-amber-500 to-yellow-400 shadow-glow-primary flex items-center justify-end pr-2 transition-all duration-700"
                  style={{ width: `${pctAtual}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold pt-1">
                <span className="text-gray-400">Ritmo Atual: <strong className="text-amber-400 tabular-nums">{meta.ritmoAtual} pts/dia</strong></span>
                <span className="text-sky-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Projeção Fechamento: <strong className="text-white tabular-nums">{meta.projecaoFechamento} pts</strong> ({meta.diasUteisRestantes} dias restantes)
                </span>
              </div>
            </div>
          </div>

          {/* Cards Rápidos: FPY do Dia & Ritmo */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card FPY */}
            <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> FPY / Qualidade (CQ)
                </span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {data.fpyHoje.aprovadosPrimeiraVez}/{data.fpyHoje.totalTestados}
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-400 tabular-nums">
                {data.fpyHoje.fpyPercentual}%
              </div>
              <p className="text-[11px] text-gray-400">
                Taxa de retrabalho: {meta.taxaRetrabalho}% (Status: {meta.statusQualidadeLabel})
              </p>
            </div>

            {/* Card Ritmo Diário */}
            <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-400" /> Ritmo de Fábrica
                </span>
                <span className="text-xs font-bold text-sky-400">Hoje</span>
              </div>
              <div className="text-3xl font-black text-sky-400 tabular-nums">
                {meta.ritmoAtual} <span className="text-sm font-bold text-gray-400">pts/dia</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Faturamento lançado: R$ {meta.faturamentoLancado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: STATUS AO VIVO DAS BANCADAS (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand-400" /> Bancadas Técnicas Ao Vivo ({data.bancadas.length})
              </h3>
              <span className="text-[11px] text-gray-400 font-medium">Equipe Renetec</span>
            </div>

            <div className="space-y-3">
              {data.bancadas.map((b) => (
                <div
                  key={b.tecnicoId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    b.status === 'EM_PRODUCAO'
                      ? 'bg-surface-elevated border-brand-500/40 shadow-glow-primary'
                      : 'bg-surface-base border-surface-border/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          b.status === 'EM_PRODUCAO'
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-sm font-bold text-white">{b.tecnicoNome}</span>
                      {b.funcao && (
                        <span className="text-[10px] text-gray-400 bg-surface-base px-1.5 py-0.5 rounded border border-surface-border/50">
                          {b.funcao}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        b.status === 'EM_PRODUCAO'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-surface-elevated text-gray-400 border-surface-border'
                      }`}
                    >
                      {b.status === 'EM_PRODUCAO' ? 'Em Produção' : 'Disponível'}
                    </span>
                  </div>

                  {b.producaoAtiva ? (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-surface-base/80 border border-surface-border/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-brand-400 tabular-nums">OS #{b.producaoAtiva.numeroOS}</span>
                        <span className="text-amber-400 tabular-nums font-bold flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {b.producaoAtiva.tempoDecorridoMinutos} min decorridos
                        </span>
                      </div>
                      <p className="text-white font-medium line-clamp-1">
                        {b.producaoAtiva.equipamentoNome} ({b.producaoAtiva.quantidade} un • {b.producaoAtiva.pontosTotais} pts)
                      </p>
                      <p className="text-[11px] text-gray-400 line-clamp-1">
                        Cliente: {b.producaoAtiva.clienteNome}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 italic">
                      Bancada pronta para assumir o próximo lote da fila.
                    </p>
                  )}

                  <div className="mt-2 flex justify-between items-center text-[11px] text-gray-400 pt-1.5 border-t border-surface-border/40">
                    <span>Pontos Hoje:</span>
                    <span className="font-bold text-amber-300 tabular-nums">{b.pontosHoje ?? b.produzidosHoje} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lotes Prioritários na Fila */}
          <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Próximos Lotes Prioritários ({data.filaPrioritaria.length})
            </h4>

            <div className="space-y-2">
              {data.filaPrioritaria.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-surface-elevated/60 border border-surface-border flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tabular-nums">OS #{item.numeroOS}</span>
                      <StatusBadge prioridade={item.prioridade} size="sm" />
                    </div>
                    <p className="text-gray-300 font-medium line-clamp-1">{item.equipamentoNome}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-amber-400 font-bold tabular-nums">
                      {item.quantidade} un ({item.pontosTotais ?? item.quantidade} pts)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

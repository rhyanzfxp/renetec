import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApiService } from './dashboard.service';
import type { TvFabricaResponse } from './dashboard.types';
import { useRealtime } from '../realtime/RealtimeContext';
import { Button } from '../../components/ui/Button';
import {
  Tv,
  Maximize,
  Minimize,
  Flame,
  Clock,
  Wrench,
  Zap,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Activity,
} from 'lucide-react';

export const TvFabricaPage: React.FC = () => {
  const [data, setData] = useState<TvFabricaResponse | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Relógio digital em tempo real com segundos
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
      // Falha silenciosa para não interromper a TV
    }
  }, []);

  const { subscribe } = useRealtime();

  // Polling a cada 45s + recarrega em eventos de produção (debounce 500ms)
  // Intervalo maior porque a TV fica aberta o dia todo — economiza CPU/rede
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 45000);

    const unsubscribe = subscribe('*', () => {
      // Debounce simples: espera 500ms antes de recarregar
      if ((loadData as any)._debounceTimer) clearTimeout((loadData as any)._debounceTimer);
      (loadData as any)._debounceTimer = setTimeout(() => loadData(), 500);
    });

    return () => {
      clearInterval(interval);
      if ((loadData as any)._debounceTimer) clearTimeout((loadData as any)._debounceTimer);
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
      <div className="h-full min-h-[85vh] flex flex-col items-center justify-center space-y-4 bg-[#070b14]">
        <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-400 animate-spin shadow-glow-primary" />
        <p className="text-base font-bold text-gray-300 font-mono tracking-wider uppercase">
          Carregando Painel Industrial Renetec...
        </p>
      </div>
    );
  }

  const meta = data.meta;
  const maxScale = Math.max(meta.metaExcelencia + 50, 250);
  const pctAtual = Math.min(100, Math.max(0, (meta.pontosRealizados / maxScale) * 100));
  const pctProjecao = Math.min(100, Math.max(0, (meta.projecaoFechamento / maxScale) * 100));
  const pctBase = (meta.metaBase / maxScale) * 100;
  const pctAlvo = (meta.metaAlvo / maxScale) * 100;
  const pctExcelencia = (meta.metaExcelencia / maxScale) * 100;

  return (
    <div className="space-y-4 select-none pb-8 text-gray-100 font-sans">
      {/* ─── 1. TOP HEADER ESTILO NOC INDUSTRIAL COM RELÓGIO GIGANTE ──────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1120] border border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-500" />
        
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 text-xs font-black tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE NOC
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
              <Tv className="w-6 h-6 text-amber-400" /> PAINEL RENETEC
            </h1>
            <p className="text-xs text-gray-400 capitalize font-medium">{currentDate}</p>
          </div>
        </div>

        {/* Relógio Digital Gigante Estilo Grafana */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-3xl sm:text-5xl font-black text-cyan-300 font-mono tabular-nums tracking-widest drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              {currentTime}
            </div>
            <p className="text-[11px] text-gray-400 font-mono tracking-wider">
              Sincronizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={toggleFullscreen}
            leftIcon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            title="Alternar Modo Tela Cheia"
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
          >
            {isFullscreen ? 'Janela' : 'Tela Cheia'}
          </Button>
        </div>
      </div>

      {/* ─── 2. GRID PRINCIPAL (TERMÔMETRO GIGANTE + GRAFANA STATS + BANCADAS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LADO ESQUERDO: TERMÔMETRO DE METAS & STATS GIGANTES (7 colunas) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Card Principal da Meta Coletiva — Estilo Big Stat Grafana */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" /> META MENSAL COLETIVA — {meta.mesNome.toUpperCase()}/{meta.ano}
                </span>
                
                {/* BIG STAT GIGANTE */}
                <div className="flex items-baseline gap-4 mt-2">
                  <span className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tight font-mono drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                    {meta.pontosRealizados}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400/80 font-mono">
                      / {meta.metaAlvo} pts
                    </span>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Alvo Oficial
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat de Atingimento % */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                <div className="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-300 font-black text-2xl sm:text-3xl font-mono tabular-nums shadow-[0_0_20px_rgba(251,191,36,0.25)]">
                  {meta.percentualAlvo}%
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#111c35] border border-gray-700 text-gray-200 tracking-wider">
                  {meta.statusMetaLabel}
                </span>
              </div>
            </div>

            {/* O Termômetro Visual em Escala Gigante */}
            <div className="space-y-3 pt-2">
              {/* Marcadores de Escala */}
              <div className="relative h-7 w-full text-xs font-black select-none">
                <div className="absolute -translate-x-1/2" style={{ left: `${pctBase}%` }}>
                  <span className="px-2 py-1 rounded-lg bg-amber-950/90 border border-amber-500/70 text-amber-300 text-xs font-black shadow-md">
                    🟡 Base: {meta.metaBase}
                  </span>
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: `${pctAlvo}%` }}>
                  <span className="px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400/70 text-emerald-300 text-xs font-black shadow-md">
                    🟢 Alvo: {meta.metaAlvo}
                  </span>
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: `${pctExcelencia}%` }}>
                  <span className="px-2.5 py-1 rounded-lg bg-yellow-950/90 border border-yellow-400 text-yellow-300 text-xs font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse">
                    🏆 Excelência: {meta.metaExcelencia}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Industrial Grafana */}
              <div className="relative h-9 w-full bg-[#070b14] rounded-2xl p-1.5 border border-[#1e293b] overflow-hidden shadow-inner">
                <div
                  className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-cyan-500/20 border-r-2 border-cyan-400"
                  style={{ width: `${pctProjecao}%` }}
                  title={`Projeção: ${meta.projecaoFechamento} pts`}
                />
                <div
                  className="relative h-full rounded-xl bg-gradient-to-r from-brand-500 via-amber-500 to-emerald-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center justify-end pr-2.5 transition-all duration-700"
                  style={{ width: `${Math.max(pctAtual, 2)}%` }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white animate-ping shadow-[0_0_10px_#fff]" />
                </div>
              </div>

              {/* Sub-indicadores de Ritmo e Projeção */}
              <div className="flex flex-wrap justify-between items-center text-xs sm:text-sm font-black pt-1 gap-2">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" /> Ritmo Atual: <strong className="text-amber-400 font-mono text-base">{meta.ritmoAtual} pts/dia</strong>
                </span>
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Projeção: <strong className="text-white font-mono text-base">{meta.projecaoFechamento} pts</strong> ({meta.diasUteisRestantes} dias restantes)
                </span>
              </div>
            </div>
          </div>

          {/* Grid de 3 Cards Grafana Big Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card FPY / Qualidade */}
            <div className="p-5 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-black uppercase text-gray-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> FPY (CQ)
                </span>
                <span className="font-mono text-gray-300">{data.fpyHoje.aprovadosPrimeiraVez}/{data.fpyHoje.totalTestados}</span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                {data.fpyHoje.fpyPercentual}%
              </div>
              <p className="text-xs text-gray-400 font-medium truncate">
                Aprovação direta sem retrabalho
              </p>
            </div>

            {/* Card Ritmo Diário */}
            <div className="p-5 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-black uppercase text-gray-400">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Zap className="w-4 h-4" /> Ritmo Diário
                </span>
                <span className="font-mono text-sky-400">HOJE</span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-sky-400 font-mono tabular-nums drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                {meta.ritmoAtual}
                <span className="text-sm font-bold text-gray-400 ml-1">pts</span>
              </div>
              <p className="text-xs text-gray-400 font-medium truncate">
                Produção média da fábrica
              </p>
            </div>

            {/* Card Taxa de Retrabalho */}
            <div className="p-5 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-2 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-black uppercase text-gray-400">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <RotateCcw className="w-4 h-4" /> Retrabalho
                </span>
                <span className="font-mono text-rose-400">CQ</span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-rose-400 font-mono tabular-nums drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]">
                {meta.taxaRetrabalho}%
              </div>
              <p className="text-xs text-gray-400 font-medium truncate">
                {meta.statusQualidadeLabel}
              </p>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: BANCADAS TÉCNICAS AO VIVO (5 colunas) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0d1527] border border-[#1e293b] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3.5">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" /> BANCADAS TÉCNICAS AO VIVO ({data.bancadas.length})
              </h3>
              <span className="text-[11px] text-gray-400 font-mono font-medium">Pontos de CQ Aprovados</span>
            </div>

            <div className="space-y-3.5">
              {data.bancadas.map((b) => (
                <div
                  key={b.tecnicoId}
                  className={`p-4 rounded-2xl border transition-all ${
                    b.status === 'EM_PRODUCAO'
                      ? 'bg-[#111c35] border-brand-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'bg-[#090f1d] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          b.status === 'EM_PRODUCAO'
                            ? 'bg-emerald-400 animate-ping shadow-[0_0_10px_#34d399]'
                            : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-base font-black text-white tracking-wide">{b.tecnicoNome}</span>
                      {b.funcao && (
                        <span className="text-[10px] font-bold text-gray-300 bg-[#162038] px-2 py-0.5 rounded-md border border-gray-700">
                          {b.funcao}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider font-mono ${
                        b.status === 'EM_PRODUCAO'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-[#162038] text-gray-400 border-gray-700'
                      }`}
                    >
                      {b.status === 'EM_PRODUCAO' ? 'EM PRODUÇÃO' : 'DISPONÍVEL'}
                    </span>
                  </div>

                  {b.producaoAtiva ? (
                    <div className="mt-3 p-3 rounded-xl bg-[#080d1a] border border-brand-500/30 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-brand-400 tabular-nums font-mono text-sm">OS #{b.producaoAtiva.numeroOS}</span>
                        <span className="text-amber-400 tabular-nums font-black flex items-center gap-1 font-mono text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" /> {b.producaoAtiva.tempoDecorridoMinutos} min
                        </span>
                      </div>
                      <p className="text-white font-bold text-xs truncate">
                        {b.producaoAtiva.equipamentoNome} ({b.producaoAtiva.quantidade} un)
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {b.producaoAtiva.clienteNome}
                      </p>
                    </div>
                  ) : null}

                  {/* STATS MATRIX GIGANTE ESTILO GRAFANA */}
                  <div className="mt-3 grid grid-cols-4 gap-2 pt-2.5 border-t border-[#1e293b]">
                    <div className="text-center p-2 rounded-xl bg-[#070c18] border border-gray-800">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">PTS HOJE</p>
                      <p className="text-2xl font-black text-amber-300 font-mono tabular-nums leading-tight mt-0.5">
                        {b.pontosHoje ?? 0}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#070c18] border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TESTADOS</p>
                      <p className="text-2xl font-black text-slate-100 font-mono tabular-nums leading-tight mt-0.5">
                        {(b as any).quantidadeTestadaHoje ?? 0}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#070c18] border border-gray-800">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">APROVADOS</p>
                      <p className="text-2xl font-black text-emerald-400 font-mono tabular-nums leading-tight mt-0.5">
                        {(b as any).quantidadeAprovadaHoje ?? 0}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#070c18] border border-gray-800">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">RETRABALHO</p>
                      <p className="text-2xl font-black text-rose-400 font-mono tabular-nums leading-tight mt-0.5">
                        {(b as any).retrabalhoHoje ?? 0}
                      </p>
                    </div>
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


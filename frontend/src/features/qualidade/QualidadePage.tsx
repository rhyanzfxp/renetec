import React, { useState, useEffect, useCallback } from 'react';
import { qualidadeApiService } from './teste.service';
import type { FilaTesteItem, HistoricoTesteItem } from './teste.types';
import { useRealtime } from '../realtime/RealtimeContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/KpiCard';
import { RealizarTesteDrawer } from './RealizarTesteDrawer';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  User,
  ShieldCheck,
  History
} from 'lucide-react';

export const QualidadePage: React.FC = () => {
  const [fila, setFila] = useState<FilaTesteItem[]>([]);
  const [historico, setHistorico] = useState<HistoricoTesteItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FilaTesteItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [filaData, histData] = await Promise.all([
        qualidadeApiService.getFila(),
        qualidadeApiService.getHistorico(1, 5),
      ]);
      setFila(filaData);
      setHistorico(histData.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao carregar fila de controle de qualidade.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { subscribe } = useRealtime();

  useEffect(() => {
    loadData();
    const unsubscribe = subscribe('*', () => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData, subscribe]);

  // Aprovação Rápida 100% de um lote sem reprovações
  const handleAprovacaoRapida = async (item: FilaTesteItem) => {
    try {
      setErrorMessage(null);
      const producaoId =
        item.producoes?.[0]?.id || item.producaoRecente?.id || `prod-ref-${item.id}`;

      await qualidadeApiService.realizarTeste({
        producaoId,
        itemOrdemServicoId: item.id,
        quantidadeTestada: item.quantidade,
        quantidadeAprovada: item.quantidade,
        quantidadeReprovada: 0,
        observacao: 'Aprovação direta em conformidade 100% no teste de bancada de CQ.',
      });

      setSuccessMessage(`OS #${item.ordemServico.numeroOS}: Lote de ${item.quantidade} un aprovado com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Erro ao aprovar lote.');
    }
  };

  const openInspecao = (item: FilaTesteItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
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

      {/* ─── 1. CARDS DE KPI ESPECÍFICOS DO CQ ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Lotes na Mesa de CQ"
          value={fila.length}
          unit="lotes"
          subtext="Aguardando inspeção"
          variant="info"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <KpiCard
          label="Unidades no CQ"
          value={fila.reduce((acc, i) => acc + i.quantidade, 0)}
          unit="unidades"
          subtext="Volume total para teste"
          variant="default"
          icon={<FileCheck className="w-4 h-4" />}
        />
        <KpiCard
          label="Taxa de Aprovação (FPY)"
          value="98.1%"
          subtext="Aprovados na 1ª passagem"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Índice de Retrabalho"
          value="1.9%"
          subtext="Necessitou novo reparo"
          variant="warning"
          icon={<XCircle className="w-4 h-4" />}
        />
      </div>

      {/* ─── 2. FILA DE LOTES AGUARDANDO INSPEÇÃO ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Fila de Inspeção de Qualidade ({fila.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Lotes liberados pelos técnicos de produção aguardando testes de carga, calibração e validação para a meta.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Atualizar Fila
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 rounded-xl bg-surface-card border border-surface-border animate-pulse p-4 space-y-3" />
            ))}
          </div>
        ) : fila.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-card border border-surface-border text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Mesa de Controle de Qualidade limpa!</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Todos os lotes liberados pela produção já foram inspecionados, aprovados ou encaminhados para retrabalho.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fila.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-surface-muted transition-all duration-150 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 tabular-nums">
                        OS #{item.ordemServico.numeroOS}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.tipoCategoria === 'SEM_DEFEITO'
                          ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                          : item.tipoCategoria === 'RETRABALHO'
                          ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                          : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      }`}>
                        {item.tipoCategoria === 'SEM_DEFEITO' ? '✅ Sem Defeito' : item.tipoCategoria === 'RETRABALHO' ? '🔄 Retrabalho' : '🔧 Reparado'}
                      </span>
                    </div>
                    <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {item.tipoEquipamento.nome}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {item.ordemServico.cliente.nomeRazaoSocial}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-300 py-1.5 border-y border-surface-border/50">
                    <span>Lote a Testar: <strong className="text-white tabular-nums">{item.quantidade} un</strong></span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <User className="w-3 h-3 text-sky-400" />
                      Técnico: <strong className="text-gray-200">{item.tecnicoAlocado?.nome || 'Samuel'}</strong>
                    </span>
                  </div>

                  {(item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado || item.servicoRealizado) && (
                    <p className="text-xs text-gray-400 line-clamp-2 bg-surface-base/60 p-2 rounded border border-surface-border/50">
                      <span className="font-semibold text-gray-300">Serviço Feito:</span> {item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado || item.servicoRealizado}
                    </p>
                  )}
                </div>


                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInspecao(item)}
                    leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                    className="w-full"
                  >
                    Inspecionar
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleAprovacaoRapida(item)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="w-full"
                  >
                    Aprovar 100%
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. HISTÓRICO DE LAUDOS DE CQ ──────────────────────────────────── */}
      {historico.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Laudos de Inspeção Concluídos Recentemente
          </h3>

          <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border overflow-hidden">
            {historico.map((h, idx) => (
              <div key={h.id || idx} className="p-3 sm:px-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white tabular-nums">
                      OS #{h.producao?.itemOrdemServico?.ordemServico?.numeroOS || '—'}
                    </span>
                    <span className="text-gray-400">—</span>
                    <span className="text-gray-300 font-medium">
                      {h.producao?.itemOrdemServico?.tipoEquipamento?.nome || 'Equipamento'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Inspetor: {h.inspetor?.nome || 'Controle de Qualidade'} {h.observacao ? `• ${h.observacao}` : ''}
                  </p>
                </div>

                <div className="text-right flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold tabular-nums">
                    +{h.quantidadeAprovada} Aprovadas (Meta)
                  </span>
                  {h.quantidadeReprovada > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold tabular-nums">
                      {h.quantidadeReprovada} Retrabalho
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer de Inspeção */}
      <RealizarTesteDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        item={selectedItem}
        onSuccess={loadData}
      />
    </div>
  );
};

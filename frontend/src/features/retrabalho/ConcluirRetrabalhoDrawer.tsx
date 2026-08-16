import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { retrabalhoApiService } from './retrabalho.service';
import type { RetrabalhoItemData } from './retrabalho.types';
import {
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

interface ConcluirRetrabalhoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  retrabalho: RetrabalhoItemData | null;
  onSuccess: () => void;
}

export const ConcluirRetrabalhoDrawer: React.FC<ConcluirRetrabalhoDrawerProps> = ({
  isOpen,
  onClose,
  retrabalho,
  onSuccess,
}) => {
  const [solucaoAplicada, setSolucaoAplicada] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (retrabalho) {
      setSolucaoAplicada('');
      setObservacao('');
      setErrorMessage(null);
    }
  }, [retrabalho]);

  if (!retrabalho) return null;

  const item = retrabalho.itemOrdemServico;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!solucaoAplicada.trim() || solucaoAplicada.trim().length < 5) {
      setErrorMessage('Descreva a solução técnica aplicada no reparo (mínimo de 5 caracteres).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await retrabalhoApiService.concluir(retrabalho.id, {
        solucaoAplicada: solucaoAplicada.trim(),
        observacao: observacao.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao concluir ordem de retrabalho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Concluir Retrabalho e Enviar para Re-teste"
      subtitle={`OS #${item.ordemServico.numeroOS} — ${item.ordemServico.cliente.nomeRazaoSocial}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="warning"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Concluir Reparo e Enviar ao CQ
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 flex items-start gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumo do Lote e Equipamento */}
        <div className="p-3.5 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Equipamento em Reparo Corretivo</span>
            <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
          </div>
          <p className="text-sm font-bold text-white">
            {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
          </p>
          <div className="flex justify-between text-xs text-gray-300 pt-1 border-t border-surface-border/50">
            <span>Volume em Retrabalho:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {retrabalho.quantidadeRetrabalho} unidades
            </span>
          </div>
        </div>

        {/* Ficha da Não-Conformidade Apontada pelo CQ */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Laudo do CQ / Motivo de Reprovação
            </span>
            {retrabalho.motivoReprovacao && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                {retrabalho.motivoReprovacao.codigo}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-200 font-semibold">
            {retrabalho.motivoReprovacao?.descricao || 'Defeito identificado no ensaio funcional'}
          </p>

          {retrabalho.detalhesDefeito && (
            <div className="p-2 rounded bg-surface-base/80 border border-surface-border/60 text-xs text-gray-300">
              <span className="text-gray-400 font-semibold">Instruções do Inspetor:</span>{' '}
              {retrabalho.detalhesDefeito}
            </div>
          )}
        </div>

        {/* Solução Técnica Aplicada */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Solução Técnica Aplicada no Retrabalho <span className="text-red-400">*</span>
          </label>
          <textarea
            value={solucaoAplicada}
            onChange={(e) => setSolucaoAplicada(e.target.value)}
            rows={3}
            placeholder="Ex: Substituição do varistor danificado, limpeza com fluxo no barramento e ressolda completa dos pads térmicos."
            required
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
          />
        </div>

        {/* Observações Complementares para o Re-teste */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Observações para a Re-inspeção do CQ (Opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Ex: Testado em bancada por 15 minutos em 24V sem aquecimento."
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300">
          <p className="font-semibold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" /> Fluxo Operacional de Re-teste:
          </p>
          <p className="mt-1 text-gray-400">
            Ao concluir, o lote assumirá o status <strong className="text-purple-300">Aguardando Reteste</strong> e retornará com prioridade para a bancada do Controle de Qualidade (CQ).
          </p>
        </div>
      </form>
    </Drawer>
  );
};

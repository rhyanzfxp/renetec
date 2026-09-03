import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { qualidadeApiService } from './teste.service';
import type { FilaTesteItem } from './teste.types';

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  User
} from 'lucide-react';

interface RealizarTesteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: FilaTesteItem | null;
  onSuccess: () => void;
}

export const RealizarTesteDrawer: React.FC<RealizarTesteDrawerProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [qtdTestada, setQtdTestada] = useState<number>(0);
  const [aprovadas, setAprovadas] = useState<number>(0);
  const [reprovadas, setReprovadas] = useState<number>(0);
  const [detalhesDefeito, setDetalhesDefeito] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  // Sincroniza quantidades com o lote do item selecionado
  useEffect(() => {
    if (item) {
      const qtd = item.quantidade;
      setQtdTestada(qtd);
      setAprovadas(qtd); // Padrão: sugere 100% de aprovação
      setReprovadas(0);
      setDetalhesDefeito('');
      setObservacao('');
      setErrorMessage(null);
      isSubmittingRef.current = false;
    }
  }, [item]);

  if (!item) return null;

  const totalCalculado = Number(aprovadas) + Number(reprovadas);
  const qtdLoteTotal = item.quantidade;
  const isSomaValida = totalCalculado === Number(qtdTestada) && Number(qtdTestada) > 0 && Number(qtdTestada) <= qtdLoteTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!isSomaValida) {
      setErrorMessage(
        `A soma de Aprovadas (${aprovadas}) + Reprovadas (${reprovadas}) totaliza ${totalCalculado} un, mas a quantidade a testar é ${qtdTestada} un (máx ${qtdLoteTotal} un).`
      );
      return;
    }

    if (reprovadas > 0 && !detalhesDefeito.trim() && !observacao.trim()) {
      setErrorMessage('Informe a descrição do defeito/não-conformidade para o técnico corrigir no retrabalho.');
      return;
    }

    // Obtém o ID da produção vinculada (ou usa fallback seguro)
    const producaoId =
      item.producoes?.[0]?.id || item.producaoRecente?.id || `prod-ref-${item.id}`;

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      await qualidadeApiService.realizarTeste({
        producaoId,
        itemOrdemServicoId: item.id,
        tecnicoResponsavelId: item.tecnicoAlocadoId || item.tecnicoAlocado?.id || (item.producoes?.[0] as any)?.tecnicoId || undefined,
        tecnicoDestinoId: item.tecnicoAlocadoId || item.tecnicoAlocado?.id || undefined,
        quantidadeTestada: Number(qtdTestada),
        quantidadeAprovada: Number(aprovadas),
        quantidadeReprovada: Number(reprovadas),
        motivoReprovacaoId: reprovadas > 0 ? 'mot-01' : undefined,
        detalhesDefeito: reprovadas > 0 ? (detalhesDefeito.trim() || observacao.trim() || 'Defeito identificado no CQ') : undefined,
        observacao: observacao.trim() || detalhesDefeito.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao registrar laudo de inspeção do CQ.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Inspeção de Controle de Qualidade (CQ)"
      subtitle={`OS #${item.ordemServico.numeroOS} — ${item.ordemServico.cliente.nomeRazaoSocial}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant={reprovadas > 0 ? 'warning' : 'success'}
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!isSomaValida}
            leftIcon={<FileCheck className="w-4 h-4" />}
          >
            {reprovadas > 0 ? 'Gravar Laudo com Reprovações' : 'Aprovar Lote 100%'}
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

        {/* Resumo do Lote Inspecionado */}
        <div className="p-3.5 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Equipamento a Testar</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                item.tipoCategoria === 'SEM_DEFEITO'
                  ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                  : item.tipoCategoria === 'RETRABALHO'
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              }`}>
                {item.tipoCategoria === 'SEM_DEFEITO' ? '✅ Triagem (Sem Defeito)' : item.tipoCategoria === 'RETRABALHO' ? '🔄 Retrabalho' : '🔧 Reparado'}
              </span>
              <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
            </div>
          </div>
          <p className="text-sm font-bold text-white">
            {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-border/50 text-gray-300">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Técnico Responsável: <strong className="text-white">{item.tecnicoAlocado?.nome || 'Samuel'}</strong></span>
            </div>
            <div className="text-right">
              <span>Lote Disponível: <strong className="text-amber-400 tabular-nums">{qtdLoteTotal} un</strong></span>
            </div>
          </div>

          {(item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado) && (
            <div className="mt-2 p-2 rounded bg-surface-base/80 border border-surface-border/60 text-xs text-gray-300">
              <span className="text-gray-400 font-semibold">Serviço Realizado pelo Técnico:</span>{' '}
              {item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado}
            </div>
          )}
        </div>

        {/* Painel de Quantidades: Aprovados + Reprovados = Total */}
        <div className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Quantidades Inspecionadas
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Testar agora:</span>
              <input
                type="number"
                min="1"
                max={qtdLoteTotal}
                value={qtdTestada === 0 ? '' : qtdTestada}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(qtdLoteTotal, Math.max(0, parseInt(raw)));
                  setQtdTestada(v);
                  if (raw !== '') {
                    setAprovadas(v);
                    setReprovadas(0);
                  }
                }}
                className="w-16 h-7 px-2 bg-[#12161f] border border-surface-border rounded text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-brand-500"
              />
              <span className="text-xs text-gray-400">/ {qtdLoteTotal} un</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovadas (Para a Meta)
              </label>
              <Input
                type="number"
                value={aprovadas === 0 ? '' : aprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(qtdTestada, Math.max(0, parseInt(raw)));
                  setAprovadas(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setReprovadas(Math.max(0, qtdTestada - v));
                }}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Reprovadas (Retrabalho)
              </label>
              <Input
                type="number"
                value={reprovadas === 0 ? '' : reprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(qtdTestada, Math.max(0, parseInt(raw)));
                  setReprovadas(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setAprovadas(Math.max(0, qtdTestada - v));
                }}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Validação de Soma */}
          <div
            className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold ${
              isSomaValida
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                : 'bg-red-950/40 text-red-300 border border-red-800/40 animate-pulse'
            }`}
          >
            <span>
              Equação: <strong className="tabular-nums">{aprovadas}</strong> (Aprov.) +{' '}
              <strong className="tabular-nums">{reprovadas}</strong> (Reprov.) ={' '}
              <strong className="tabular-nums">{totalCalculado}</strong> / {qtdTestada} un testadas
            </span>
            <span>{isSomaValida ? 'Soma correta' : 'Divergência de soma'}</span>
          </div>
        </div>

        {/* Seção Condicional: Motivo de Reprovação (se houver reprovadas > 0) */}
        {reprovadas > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Motivo de Não-Conformidade & Retrabalho
              </span>
              <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                Devolução p/ {item.tecnicoAlocado?.nome || 'Samuel'}
              </span>
            </div>

            <p className="text-[11px] text-amber-200 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
              <strong>Atenção:</strong> As <strong>{reprovadas} unidade(s)</strong> reprovadas serão encaminhadas imediatamente para a fila de Retrabalho do técnico <strong>{item.tecnicoAlocado?.nome || 'Samuel'}</strong> para correção.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-200">
                Descrição do Defeito / O que o técnico precisa corrigir <span className="text-red-400">*</span>
              </label>
              <textarea
                value={detalhesDefeito}
                onChange={(e) => setDetalhesDefeito(e.target.value)}
                rows={3}
                placeholder="Ex: 4 unidades apresentaram ripple excessivo na alimentação secundária e capacitor C12 estufado..."
                className="w-full bg-[#131720] border border-surface-border rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* Observações Gerais do Laudo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-300 tracking-wider">
            Observações Técnicas do Laudo (Opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Ex: Lote submetido a ensaio de carga e teste óptico em bancada."
            className="w-full bg-[#131720] border border-surface-border rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};


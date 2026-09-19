import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { qualidadeApiService } from './teste.service';
import type { FilaTesteItem } from './teste.types';

import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  User,
  Ban,
  RotateCcw,
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
  const [sucata, setSucata] = useState<number>(0);
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
      setSucata(0);
      setDetalhesDefeito('');
      setObservacao('');
      setErrorMessage(null);
      isSubmittingRef.current = false;
    }
  }, [item]);

  if (!item) return null;

  const totalCalculado = Number(aprovadas) + Number(reprovadas) + Number(sucata);
  const qtdLoteTotal = item.quantidade;
  const isSomaValida = totalCalculado === Number(qtdTestada) && Number(qtdTestada) > 0 && Number(qtdTestada) <= qtdLoteTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!isSomaValida) {
      setErrorMessage(
        `A soma de Aprovadas (${aprovadas}) + Retrabalho (${reprovadas}) + Sucata (${sucata}) totaliza ${totalCalculado} un, mas a quantidade a testar é ${qtdTestada} un (máx ${qtdLoteTotal} un).`
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
        quantidadeSucata: Number(sucata),
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
            {reprovadas > 0
              ? 'Gravar Laudo com Retrabalho'
              : sucata > 0
              ? 'Gravar Laudo com Sucata'
              : 'Aprovar Lote 100%'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/40 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumo do Lote Inspecionado */}
        <div className="p-3.5 rounded-lg bg-surface-elevated border border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Equipamento a Testar</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                item.tipoCategoria === 'SEM_DEFEITO'
                  ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:border-sky-500/40 dark:text-sky-300'
                  : item.tipoCategoria === 'RETRABALHO'
                  ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:border-purple-500/40 dark:text-purple-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-300'
              }`}>
                {item.tipoCategoria === 'SEM_DEFEITO' ? '✅ Triagem (Sem Defeito)' : item.tipoCategoria === 'RETRABALHO' ? '🔄 Retrabalho' : '🔧 Reparado'}
              </span>
              <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-border/50 text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Técnico Responsável: <strong className="text-gray-900 dark:text-white">{item.tecnicoAlocado?.nome || 'Samuel'}</strong></span>
            </div>
            <div className="text-right">
              <span>Lote Disponível: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{qtdLoteTotal} un</strong></span>
            </div>
          </div>

          {(item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado) && (
            <div className="mt-2 p-2 rounded bg-surface-base/80 border border-surface-border/60 text-xs text-gray-700 dark:text-gray-300">
              <span className="text-gray-500 dark:text-gray-400 font-semibold">Serviço Realizado pelo Técnico:</span>{' '}
              {item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado}
            </div>
          )}
        </div>

        {/* Painel de Quantidades: Aprovados + Reprovados + Sucata = Total */}
        <div className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Classificação do Teste
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Testar agora:</span>
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
                    setSucata(0);
                  }
                }}
                className="w-16 h-7 px-2 bg-surface-card border border-surface-border rounded text-xs text-center text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:border-brand-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">/ {qtdLoteTotal} un</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Aprovadas */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovadas (Meta)
              </label>
              <Input
                type="number"
                min="0"
                value={aprovadas === 0 ? '' : aprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.max(0, parseInt(raw));
                  setAprovadas(v);
                }}
                placeholder="0"
                required
              />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">Contam p/ meta</span>
            </div>

            {/* 2. Reprovadas (Retrabalho) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Retrabalho (Técnico)
              </label>
              <Input
                type="number"
                min="0"
                value={reprovadas === 0 ? '' : reprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.max(0, parseInt(raw));
                  setReprovadas(v);
                }}
                placeholder="0"
                required
              />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">Volta p/ bancada</span>
            </div>

            {/* 3. Sucata / Morta */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" /> Sucata / Morta
              </label>
              <Input
                type="number"
                min="0"
                value={sucata === 0 ? '' : sucata}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.max(0, parseInt(raw));
                  setSucata(v);
                }}
                placeholder="0"
              />
              <span className="text-[10px] text-red-600 dark:text-red-400 block font-medium">Sem conserto / descarta</span>
            </div>
          </div>

          {/* Validação de Soma */}
          <div
            className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold ${
              isSomaValida
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40 animate-pulse'
            }`}
          >
            <span>
              Equação: <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">{aprovadas}</strong> (Aprov.) +{' '}
              <strong className="tabular-nums text-amber-700 dark:text-amber-400">{reprovadas}</strong> (Retrab.) +{' '}
              <strong className="tabular-nums text-red-700 dark:text-red-400">{sucata}</strong> (Sucata) ={' '}
              <strong className="tabular-nums">{totalCalculado}</strong> / {qtdTestada} un testadas
            </span>
            <span>{isSomaValida ? 'Soma correta' : 'Divergência de soma'}</span>
          </div>
        </div>

        {/* Aviso se houver sucata informada */}
        {sucata > 0 && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-xs text-red-800 dark:text-red-300 flex items-start gap-2 animate-fadeIn">
            <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Aviso sobre {sucata} unidade(s) de Sucata / Morta:</p>
              <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                Esses equipamentos serão registrados como sucata/sem conserto e <strong>NÃO</strong> serão enviados para a fila de retrabalho do técnico.
              </p>
            </div>
          </div>
        )}

        {/* Seção Condicional: Motivo de Reprovação (se houver reprovadas > 0) */}
        {reprovadas > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Motivo de Não-Conformidade & Retrabalho
              </span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                Devolução p/ {item.tecnicoAlocado?.nome || 'Samuel'}
              </span>
            </div>

            <p className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-300 dark:border-amber-500/30">
              <strong>Atenção:</strong> As <strong>{reprovadas} unidade(s)</strong> reprovadas serão encaminhadas imediatamente para a fila de Retrabalho do técnico <strong>{item.tecnicoAlocado?.nome || 'Samuel'}</strong> para correção.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                Descrição do Defeito / O que o técnico precisa corrigir <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                value={detalhesDefeito}
                onChange={(e) => setDetalhesDefeito(e.target.value)}
                rows={3}
                placeholder="Ex: 4 unidades apresentaram ripple excessivo na alimentação secundária e capacitor C12 estufado..."
                className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* Observações Gerais do Laudo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 tracking-wider">
            Observações Técnicas do Laudo (Opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            placeholder="Ex: Lote submetido a ensaio de carga e teste óptico em bancada."
            className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};


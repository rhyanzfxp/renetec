import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { qualidadeApiService } from './teste.service';
import type { FilaTesteItem, MotivoReprovacaoData } from './teste.types';
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
  const [aprovadas, setAprovadas] = useState<number>(0);
  const [reprovadas, setReprovadas] = useState<number>(0);
  const [motivos, setMotivos] = useState<MotivoReprovacaoData[]>([]);
  const [motivoId, setMotivoId] = useState<string>('');
  const [detalhesDefeito, setDetalhesDefeito] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega catálogo de motivos ao abrir
  useEffect(() => {
    if (isOpen) {
      qualidadeApiService.getMotivos().then((data) => {
        setMotivos(data);
        if (data.length > 0) setMotivoId(data[0].id);
      });
    }
  }, [isOpen]);

  // Sincroniza quantidades com o lote do item selecionado
  useEffect(() => {
    if (item) {
      const qtdLote = item.quantidade;
      setAprovadas(qtdLote); // Padrão: sugere 100% de aprovação
      setReprovadas(0);
      setDetalhesDefeito('');
      setObservacao('');
      setErrorMessage(null);
    }
  }, [item]);

  if (!item) return null;

  const totalCalculado = Number(aprovadas) + Number(reprovadas);
  const qtdLote = item.quantidade;
  const isSomaValida = totalCalculado === qtdLote;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSomaValida) {
      setErrorMessage(
        `A soma de Aprovadas (${aprovadas}) + Reprovadas (${reprovadas}) totaliza ${totalCalculado} un, mas o lote possui ${qtdLote} un.`
      );
      return;
    }

    if (reprovadas > 0 && !motivoId) {
      setErrorMessage('Selecione o motivo da reprovação para os itens não-conformes.');
      return;
    }

    // Obtém o ID da produção vinculada (ou usa fallback seguro)
    const producaoId =
      item.producoes?.[0]?.id || item.producaoRecente?.id || `prod-ref-${item.id}`;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await qualidadeApiService.realizarTeste({
        producaoId,
        itemOrdemServicoId: item.id,
        quantidadeTestada: qtdLote,
        quantidadeAprovada: Number(aprovadas),
        quantidadeReprovada: Number(reprovadas),
        motivoReprovacaoId: reprovadas > 0 ? motivoId : undefined,
        detalhesDefeito: reprovadas > 0 ? detalhesDefeito : undefined,
        observacao: observacao.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(e.response?.data?.message || 'Falha ao registrar laudo de inspeção do CQ.');
    } finally {
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
            <StatusBadge prioridade={item.ordemServico.prioridade} size="sm" />
          </div>
          <p className="text-sm font-bold text-white">
            {item.tipoEquipamento.nome} {item.tipoEquipamento.marca ? `(${item.tipoEquipamento.marca})` : ''}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-border/50 text-gray-300">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Técnico: <strong className="text-white">{item.tecnicoAlocado?.nome || 'Bancada Geral'}</strong></span>
            </div>
            <div className="text-right">
              <span>Tamanho do Lote: <strong className="text-amber-400 tabular-nums">{qtdLote} un</strong></span>
            </div>
          </div>

          {(item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado) && (
            <div className="mt-2 p-2 rounded bg-surface-base/80 border border-surface-border/60 text-xs text-gray-300">
              <span className="text-gray-400 font-semibold">Serviço Realizado pelo Técnico:</span>{' '}
              {item.producoes?.[0]?.servicoRealizado || item.producaoRecente?.servicoRealizado}
            </div>
          )}
        </div>

        {/* Painel da Equação Invariável: Aprovados + Reprovados = Testados */}
        <div className="p-4 rounded-xl bg-surface-base border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Resultado Quantitativo do Teste
            </label>
            <span className="text-[11px] text-gray-400">
              Obrigatório: <strong className="text-white tabular-nums">{qtdLote} un</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovadas
              </label>
              <Input
                type="number"
                value={aprovadas === 0 ? '' : aprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(qtdLote, Math.max(0, parseInt(raw)));
                  setAprovadas(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setReprovadas(qtdLote - v);
                }}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-red-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Reprovadas
              </label>
              <Input
                type="number"
                value={reprovadas === 0 ? '' : reprovadas}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const v = raw === '' ? 0 : Math.min(qtdLote, Math.max(0, parseInt(raw)));
                  setReprovadas(v === 0 && raw === '' ? 0 : v);
                  if (raw !== '') setAprovadas(qtdLote - v);
                }}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Validador Visual da Soma */}
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
              isSomaValida
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/20 border-red-500/30 text-red-300'
            }`}
          >
            <span>
              Equação: <strong className="tabular-nums">{aprovadas}</strong> (Aprov.) +{' '}
              <strong className="tabular-nums">{reprovadas}</strong> (Reprov.) ={' '}
              <strong className="tabular-nums">{totalCalculado}</strong> / {qtdLote} un
            </span>
            <span>{isSomaValida ? '✅ Soma 100% correta' : '❌ Divergência'}</span>
          </div>
        </div>

        {/* Seção Condicional: Motivo de Reprovação (se houver reprovadas > 0) */}
        {reprovadas > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Motivo de Não-Conformidade (Retrabalho)
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Categoria / Código do Defeito <span className="text-red-400">*</span>
              </label>
              <select
                value={motivoId}
                onChange={(e) => setMotivoId(e.target.value)}
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              >
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.codigo}] {m.descricao} ({m.categoria})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Detalhes da Não Conformidade para o Técnico
              </label>
              <textarea
                value={detalhesDefeito}
                onChange={(e) => setDetalhesDefeito(e.target.value)}
                rows={2}
                placeholder="Ex: Tensão no terminal secundário abaixo do nominal de 12V em teste de carga máxima."
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
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
            placeholder="Ex: Lote submetido a 45 minutos de ensaio de burn-in térmico sem desvios térmicos adicionais."
            className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>
      </form>
    </Drawer>
  );
};
